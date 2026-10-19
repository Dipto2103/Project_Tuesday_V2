# MARS LANTERN — Historical Rover Traverse Quality Control (QC) Report

**Generated:** 2026-10-19T15:20:52.261Z  
**ETL Version:** 1.0.0  
**Standards Enforced:** Spec §10.2, §10.5  

---

## 1. Summary of Processed Traverses

| Rover | Records | Sols | Cumulative Odometry | Density | Bounding Box (Display Lon) | Provenance |
|---|---|---|---|---|---|---|
| **Curiosity** | 1386 | Sol 3 to 5045 | **33.852 km** | dense | `[137.3528, -4.8251, 137.4494, -4.5891]` | `NASA-DERIVED` |
| **Perseverance** | 706 | Sol 13 to 2009 | **39.687 km** | dense | `[77.2179, 18.42, 77.4631, 18.4997]` | `NASA-DERIVED` |

---

## 2. Quality Control & Jump Checks

Per Spec §10.2:
- Suspicious coordinate leaps > 5 km between consecutive records are flagged and excluded.
- Sol non-monotonic anomalies are logged.
- Sentinel coordinates (`NULL`, `-9999`) are rejected.

### QC Issues & Anomalies Logged:

*Zero anomalies detected. All consecutive waypoint steps fall safely below the 5.0 km threshold and preserve monotonic sol indexing.*

---

## 3. Scientific Calibration Verification (§10.5)

- **Curiosity Initial Record:** Landed at Bradbury Landing (Gale Crater). First record distance to nominal touchdown (-4.5895°, 137.4417°E) is **< 0.1 km** (passing the < 5.0 km gate).
- **Perseverance Initial Record:** Landed at Octavia E. Butler Landing (Jezero Crater). First record distance to nominal touchdown (18.4447°, 77.4508°E) is **< 0.2 km** (passing the < 5.0 km gate).
- **Monotonicity Check:** Sols strictly non-decreasing; cumulative odometry strictly non-decreasing.
- **Milestone Containment:** Every milestone coordinate is confirmed inside the respective traverse bounding box.

*End of Quality Control Report.*
