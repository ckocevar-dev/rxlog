package com.rxlog.register.web;

import com.rxlog.register.api.RegisterBookRequest;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

/** JDBC-basierter Zugriff auf Bücher + Barcodes. */
@Repository
public class BookDao {

  private final JdbcTemplate jdbc;
  private final BarcodeClient barcodeClient;

  public BookDao(JdbcTemplate jdbc, BarcodeClient barcodeClient) {
    this.jdbc = jdbc;
    this.barcodeClient = barcodeClient;
  }

  private static BookSearchResult mapRow(ResultSet rs) throws SQLException {
    BookSearchResult r = new BookSearchResult();
    r.setId(rs.getString("id"));
    r.setAuthor(rs.getString("author"));
    r.setPublisher(rs.getString("publisher"));
    r.setPages((Integer) rs.getObject("pages"));
    r.setReadingStatus(rs.getString("reading_status"));
    Boolean top = (Boolean) rs.getObject("top_book");
    r.setTopBook(top != null ? top : Boolean.FALSE);
    r.setWidth((Integer) rs.getObject("width"));
    r.setHeight((Integer) rs.getObject("height"));
    String csv = rs.getString("barcodes_csv");
    if (csv != null && !csv.isBlank()) {
      String[] parts = csv.split(",");
      List<String> list = new ArrayList<>();
      for (String p : parts) {
        String s = p.trim();
        if (!s.isEmpty()) {
          list.add(s);
        }
      }
      r.setBarcodes(list);
    } else {
      r.setBarcodes(Collections.emptyList());
    }
    return r;
  }

  // ------------------------------------------------------------
  // Search (for the Admin-UI)
  // ------------------------------------------------------------
  public List<BookSearchResult> search(
      String author,
      String publisher,
      String titleLike,
      String barcode,
      String readingStatus,
      Boolean topBook,
      int limit) {
    StringBuilder sql =
        new StringBuilder(
            """
                select
                  b.id,
                  b.author,
                  b.publisher,
                  b.pages,
                  b.reading_status,
                  b.top_book,
                  b.width,
                  b.height,
                  string_agg(distinct bb.barcode, ',') as barcodes_csv
                from books b
                left join book_barcodes bb on bb.book_id = b.id
                """);

    List<Object> args = new ArrayList<>();
    List<String> where = new ArrayList<>();

    if (StringUtils.hasText(author)) {
      where.add("b.author ilike ?");
      args.add("%" + author.trim() + "%");
    }
    if (StringUtils.hasText(publisher)) {
      where.add("b.publisher ilike ?");
      args.add("%" + publisher.trim() + "%");
    }
    if (StringUtils.hasText(titleLike)) {
      where.add(
          "(b.title_keyword ilike ? or b.title_keyword2 ilike ? or b.title_keyword3 ilike ?)");
      String pat = "%" + titleLike.trim() + "%";
      args.add(pat);
      args.add(pat);
      args.add(pat);
    }
    if (StringUtils.hasText(barcode)) {
      where.add(
          """
                    exists (
                      select 1 from book_barcodes bb2
                      where bb2.book_id = b.id and bb2.barcode = ?
                    )
                    """);
      args.add(barcode.trim());
    }
    if (StringUtils.hasText(readingStatus)) {
      where.add("b.reading_status = ?");
      args.add(readingStatus.trim());
    }
    if (topBook != null) {
      where.add("b.top_book = ?");
      args.add(topBook);
    }

    if (!where.isEmpty()) {
      sql.append(" where ").append(String.join(" and ", where)).append(" ");
    }

    sql.append(
        """
                group by b.id
                order by b.registered_at desc nulls last, b.id desc
                limit ?
                """);
    args.add(limit);

    return this.jdbc.query(sql.toString(), args.toArray(), (rs, i) -> mapRow(rs));
  }

  // ------------------------------------------------------------
  // Partial-Update (Admin-UI)
  // ------------------------------------------------------------

  @Transactional
  public boolean partialUpdate(String id, BookUpdateRequest req) {
    List<String> sets = new ArrayList<>();
    List<Object> args = new ArrayList<>();
    boolean freeBarcodes = false;

    if (req.getPages() != null) {
      sets.add("pages = ?");
      args.add(req.getPages());
    }

    if (req.getReadingStatus() != null) {
      sets.add("reading_status = ?");
      args.add(req.getReadingStatus());
      sets.add("reading_status_updated_at = now()");

      String rs = req.getReadingStatus();
      // If status becomes finished or abandoned, we will erase all barcodes for this book
      if ("finished".equals(rs) || "abandoned".equals(rs)) {
        freeBarcodes = true;
      }
    }

    if (req.getTopBook() != null) {
      sets.add("top_book = ?");
      args.add(req.getTopBook());
      if (Boolean.TRUE.equals(req.getTopBook())) {
        sets.add("top_book_set_at = coalesce(top_book_set_at, now())");
      }
    }

    if (req.getWidth() != null) {
      sets.add("width = ?");
      args.add(req.getWidth());
    }

    if (req.getHeight() != null) {
      sets.add("height = ?");
      args.add(req.getHeight());
    }

    int updated = 0;
    if (!sets.isEmpty()) {
      String sql = "update books set " + String.join(", ", sets) + " where id = ?::uuid";
      args.add(id);
      updated = this.jdbc.update(sql, args.toArray());
    }

    // --- Barcode handling ------------------------------------

    if (freeBarcodes) {
      // 1) Load all barcodes currently attached to this book
      List<String> codes =
          this.jdbc.query(
              "select barcode from book_barcodes where book_id = ?::uuid",
              (rs, i) -> rs.getString(1),
              id);

      // 2) Tell the barcode service to release them (update in-memory used set)
      for (String code : codes) {
        barcodeClient.release(code);
      }

      // 3) Delete them from DB so they are not considered used on restart
      this.jdbc.update("delete from book_barcodes where book_id = ?::uuid", id);
      ++updated;

    } else if (req.getBarcodes() != null) {
      // Replace barcodes if explicitly provided in the request
      this.jdbc.update("delete from book_barcodes where book_id = ?::uuid", id);

      LinkedHashSet<String> uniq = new LinkedHashSet<>();
      for (String b : req.getBarcodes()) {
        if (b != null) {
          String s = b.trim();
          if (!s.isEmpty()) {
            uniq.add(s);
          }
        }
      }

      for (String code : uniq) {
        this.jdbc.update(
            "insert into book_barcodes (book_id, barcode) values (?::uuid, ?)", id, code);
      }

      ++updated;
    }

    return updated > 0;
  }

  // ------------------------------------------------------------
  // Insert for Registration
  // ------------------------------------------------------------

  /** Creates a new book + its barcode and returns the generated ID */
  @Transactional
  public String insert(RegisterBookRequest req) {
    boolean top = req.topBook() != null && req.topBook();

    String sql =
        """
                insert into books (
                    author,
                    publisher,
                    pages,
                    title_keyword,
                    title_keyword_position,
                    title_keyword2,
                    title_keyword2_position,
                    title_keyword3,
                    title_keyword3_position,
                    width,
                    height,
                    reading_status,
                    top_book,
                    registered_at,
                    reading_status_updated_at
                )
                values (
                    ?, ?, ?,
                    ?, ?,
                    ?, ?,
                    ?, ?,
                    ?, ?,
                    ?, ?,
                    now(),
                    now()
                )
                returning id::text
                """;

    String id =
        jdbc.queryForObject(
            sql,
            new Object[] {
              req.author(),
              req.publisher(),
              req.pages(),
              req.titleKeyword(),
              req.titleKeywordPosition(),
              req.titleKeyword2(),
              req.titleKeyword2Position(),
              req.titleKeyword3(),
              req.titleKeyword3Position(),
              req.width(),
              req.height(),
              req.readingStatus(),
              top
            },
            String.class);

    if (id == null) {
      throw new IllegalStateException("Insert returned null id");
    }

    if (req.barcode() != null && !req.barcode().isBlank()) {
      jdbc.update(
          "insert into book_barcodes (book_id, barcode) values (?::uuid, ?)",
          id,
          req.barcode().trim());
    }

    return id;
  }
}
