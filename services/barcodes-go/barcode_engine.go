package main

import (
	"encoding/csv"
	"fmt"
	"math"
	"os"
	"strconv"
	"strings"
)
// SizeRule represents one row in sizerules.csv.
// WidthMinCm / WidthMaxCm define the size band;
// SpecialHeightsCm contains heights that get a dedicated prefix/position.
type SizeRule struct {
	SizeGroup      int
	WidthMinCm     float64
	WidthMaxCm     float64
	Color          string
	ThresholdCm    float64
	LowPrefix      string
	HighPrefix     string
	SpecialPrefix  string
	SpecialHeights []float64
}

func firstToken(s string) string {
	if idx := strings.Index(s, ","); idx >= 0 {
		s = s[:idx]
	}
	return strings.TrimSpace(s)
}

func parseHeights(s string) []float64 {
	s = strings.TrimSpace(s)
	if s == "" {
		return nil
	}
	parts := strings.Split(s, ";")
	out := make([]float64, 0, len(parts))
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p == "" {
			continue
		}
		v, err := strconv.ParseFloat(strings.ReplaceAll(p, ",", "."), 64)
		if err == nil {
			out = append(out, v)
		}
	}
	return out
}

func loadSizeRulesCSV(path string) ([]SizeRule, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, fmt.Errorf("open size rules: %w", err)
	}
	defer f.Close()

	r := csv.NewReader(f)
	r.Comma = ','
	r.FieldsPerRecord = -1

	rows, err := r.ReadAll()
	if err != nil {
		return nil, fmt.Errorf("read size rules csv: %w", err)
	}
	if len(rows) < 2 {
		return nil, fmt.Errorf("size rules csv has no data")
	}

	var rules []SizeRule
	for i, row := range rows[1:] {
		if len(row) < 9 {
			return nil, fmt.Errorf("row %d: expected 9 columns, got %d", i+2, len(row))
		}
		sg, _ := strconv.Atoi(strings.TrimSpace(row[0]))
		wmin, _ := strconv.ParseFloat(strings.TrimSpace(row[1]), 64)
		wmax, _ := strconv.ParseFloat(strings.TrimSpace(row[2]), 64)
		color := firstToken(row[3])
		th, _ := strconv.ParseFloat(strings.TrimSpace(row[4]), 64)
		low := firstToken(row[5])
		high := firstToken(row[6])
		special := firstToken(row[7])
		specialHeights := parseHeights(row[8])

		rules = append(rules, SizeRule{
			SizeGroup:      sg,
			WidthMinCm:     wmin,
			WidthMaxCm:     wmax,
			Color:          color,
			ThresholdCm:    th,
			LowPrefix:      low,
			HighPrefix:     high,
			SpecialPrefix:  special,
			SpecialHeights: specialHeights,
		})
	}
	return rules, nil
}

func (r SizeRule) matchesWidth(widthCm float64) bool {
	return widthCm >= r.WidthMinCm && widthCm <= r.WidthMaxCm
}

func pickRule(rules []SizeRule, widthCm float64) (*SizeRule, error) {
	for i := range rules {
		if rules[i].matchesWidth(widthCm) {
			return &rules[i], nil
		}
	}
	return nil, fmt.Errorf("no size rule for width %.1f cm", widthCm)
}

func loadRanking(path string) ([]string, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("open ranking: %w", err)
	}
	lines := strings.Split(string(data), "\n")
	out := make([]string, 0, len(lines))
	for _, ln := range lines {
		s := strings.TrimSpace(ln)
		if len(s) != 3 {
			continue
		}
		if s[0] < '0' || s[0] > '9' || s[1] < '0' || s[1] > '9' || s[2] < '0' || s[2] > '9' {
			continue
		}
		out = append(out, s)
	}
	if len(out) == 0 {
		return nil, fmt.Errorf("ranking file seems empty or invalid")
	}
	return out, nil
}

type BarcodeSystem struct {
	rules     []SizeRule
	ranking   []string
	rankIndex map[string]int
	used      map[string]struct{}
}

func NewBarcodeSystem(rules []SizeRule, ranking []string, alreadyUsed []string) *BarcodeSystem {
	used := make(map[string]struct{}, len(alreadyUsed))
	for _, c := range alreadyUsed {
		c = strings.ToLower(strings.TrimSpace(c))
		if c != "" {
			used[c] = struct{}{}
		}
	}
	rankIndex := make(map[string]int, len(ranking))
	for i, s := range ranking {
		rankIndex[s] = i
	}
	return &BarcodeSystem{
		rules:     rules,
		ranking:   ranking,
		rankIndex: rankIndex,
		used:      used,
	}
}

func almostEqual(a, b float64) bool {
	return math.Abs(a-b) < 0.05
}

func isSpecialHeight(hCm float64, specials []float64) bool {
	hRounded := math.Round(hCm*10) / 10
	for _, s := range specials {
		if almostEqual(hRounded, s) {
			return true
		}
	}
	return false
}

func choosePrefixAndPosition(rule *SizeRule, heightCm float64) (prefix string, position string) {
	if isSpecialHeight(heightCm, rule.SpecialHeights) && rule.SpecialPrefix != "" {
		return rule.SpecialPrefix, "left"
	}
	if heightCm < rule.ThresholdCm {
		return rule.LowPrefix, "down"
	}
	return rule.HighPrefix, "up"
}

// NextBarcodeCandidate picks the next free barcode for a given width/height
// based on the loaded size rules and current usage.
// Returns code, matching rule, position ("top"/"bottom"/"left"), or an error
// if no code or rule applies.
// isSpecialHeight checks if hCm matches one of the "special" heights
// (e.g. to force a specific edge placement).
func (bs *BarcodeSystem) NextBarcodeCandidate(widthMm, heightMm int) (code string, rule *SizeRule, position string, err error) {
	if widthMm <= 0 || heightMm <= 0 {
		return "", nil, "", fmt.Errorf("width and height must be greater than zero")
	}
	wCm := float64(widthMm) / 10.0
	hCm := float64(heightMm) / 10.0

	r, err := pickRule(bs.rules, wCm)
	if err != nil {
		return "", nil, "", err
	}
	prefix, pos := choosePrefixAndPosition(r, hCm)
	if strings.TrimSpace(prefix) == "" {
		return "", nil, "", fmt.Errorf("no prefix configured for width %.1f cm and height %.1f cm", wCm, hCm)
	}

	for _, suffix := range bs.ranking {
		candidate := prefix + suffix
		key := strings.ToLower(candidate)
		if _, exists := bs.used[key]; !exists {
			return candidate, r, pos, nil
		}
	}

	return "", nil, "", fmt.Errorf("no free barcode left for prefix %s", prefix)
}

func (bs *BarcodeSystem) MarkUsed(code string) {
	code = strings.ToLower(strings.TrimSpace(code))
	if code != "" {
		bs.used[code] = struct{}{}
	}
}

func (bs *BarcodeSystem) Release(code string) {
	code = strings.ToLower(strings.TrimSpace(code))
	if code == "" {
		return
	}
	delete(bs.used, code)
}
