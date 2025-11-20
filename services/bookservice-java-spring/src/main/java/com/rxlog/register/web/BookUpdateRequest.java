package com.rxlog.register.web;

import java.util.List;

public class BookUpdateRequest {
    private Integer pages;
    private String readingStatus; // in_progress | finished | abandoned
    private Boolean topBook;
    private Integer width;  // mm
    private Integer height; // mm
    private List<String> barcodes;

    public Integer getPages() {
        return pages;
    }

    public void setPages(Integer pages) {
        this.pages = pages;
    }

    public String getReadingStatus() {
        return readingStatus;
    }

    public void setReadingStatus(String readingStatus) {
        this.readingStatus = readingStatus;
    }

    public Boolean getTopBook() {
        return topBook;
    }

    public void setTopBook(Boolean topBook) {
        this.topBook = topBook;
    }

    public Integer getWidth() {
        return width;
    }

    public void setWidth(Integer width) {
        this.width = width;
    }

    public Integer getHeight() {
        return height;
    }

    public void setHeight(Integer height) {
        this.height = height;
    }

    public List<String> getBarcodes() {
        return barcodes;
    }

    public void setBarcodes(List<String> barcodes) {
        this.barcodes = barcodes;
    }
}