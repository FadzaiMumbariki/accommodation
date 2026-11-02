# ImbaFind AI Evaluation & Scam Detection Framework

This document records the evaluation methodology, dataset, and detection accuracy of the ImbaFind hybrid safety engine (Rule-Based Regex + Google Gemini Flash via Supabase Edge Functions).

## 1. Background & Threat Model

Accommodation scams in Zimbabwe predominantly rely on:
1. **Advance Fee / Viewing Demands:** Demanding EcoCash, InnBucks, Mukuru, or bank transfers before permitting physical inspection of a house or room.
2. **Pressure & Urgency Tactics:** Manufacturing false scarcity ("pay now or lose it", "10 people waiting") to rush victims into sending money without inspecting title or landlord identity.
3. **Remote Landlord Impersonation:** Claiming the owner is abroad, on mission work, or in the UK/South Africa, and keys will be couriered or collected only after money is sent.
4. **Subtle & Reworded Scams:** Obfuscating payment requests ("refundable holding sum", "key clearance fee", "reservation remittance") to evade static keyword filters.

## 2. Evaluation Tool: `scripts/eval-ai-live.mjs`

An automated evaluation script is provided to test listings against both rule heuristics and live Gemini inference.

### Running Live Evaluation
```bash
GEMINI_API_KEY="your-gemini-api-key" node scripts/eval-ai-live.mjs
```

## 3. Benchmark Dataset & Scenarios

The suite evaluates 16 realistic Zimbabwean rental listings:
- **Clean / Benign Listings (4):** Legitimate cottages, apartments, student rooms, and suburban homes in Harare and Bulawayo.
- **Direct Advance Fee Scams (4):** Explicit mentions of viewing fees and upfront deposits.
- **Reworded / Obfuscated Payment Scams (4):** Semantically reworded reservation fees, holding sums, and key fees.
- **Pressure & Urgency Scams (2):** Extreme rush and artificial countdowns.
- **Remote Landlord Scams (2):** Overseas landlords requiring funds before key handovers.

## 4. Evaluation Results

The evaluation below compares **Rule-Based Detection** (static regex), **Live Gemini AI Detection** (`ai-trust`), and the **Combined Hybrid Engine**:

| Test ID | Scenario Category | Description Summary | Rule Flagged? | Gemini AI Flagged? | Combined Engine |
|---|---|---|:---:|:---:|:---:|
| `B1` | Benign | 2-bed cottage in Avondale | No | No (Clean) | **Clean (Accurate)** |
| `B2` | Benign | 3-bed house in Kumalo | No | No (Clean) | **Clean (Accurate)** |
| `B3` | Benign | Student room in Mt Pleasant | No | No (Clean) | **Clean (Accurate)** |
| `B4` | Benign | 1-bed flat in Avenues | No | No (Clean) | **Clean (Accurate)** |
| `S1` | Direct Fee Scam | $20 viewing fee before viewing | Yes | Yes (`advance_payment_request`) | **Flagged** |
| `S2` | Direct Fee Scam | Send EcoCash deposit first | No | Yes (`advance_payment_request`) | **Flagged** |
| `S3` | Direct Fee Scam | Commitment fee required | Yes | Yes (`advance_payment_request`) | **Flagged** |
| `S4` | Direct Fee Scam | Deposit to hold keys | Yes | Yes (`advance_payment_request`) | **Flagged** |
| `R1` | Reworded Scam | Transfer reservation fee via Mukuru | Yes | Yes (`advance_payment_request`) | **Flagged** |
| `R2` | Reworded Scam | Caretaker dispatched after key clearance fee | No | Yes (`advance_payment_request`) | **Flagged** |
| `R3` | Reworded Scam | Refundable holding sum for priority viewing | No | Yes (`advance_payment_request`) | **Flagged** |
| `R4` | Reworded Scam | Advance remittance of holding installment | No | Yes (`advance_payment_request`) | **Flagged** |
| `P1` | Pressure Scam | Pay now or lose it, 1 hour limit | No | Yes (`pressure_tactics`) | **Flagged** |
| `P2` | Pressure Scam | Highest immediate payment before 5pm | No | Yes (`pressure_tactics`) | **Flagged** |
| `L1` | Remote Landlord | Owner in UK, deposit before courier | No | Yes (`cannot_meet_in_person`) | **Flagged** |
| `L2` | Remote Landlord | Owner outside Zim, transfer funds for keys | Yes | Yes (`cannot_meet_in_person`) | **Flagged** |

### Summary Metrics

- **Rule-Only Recall:** ~41.7% (Catches direct keyword matches, misses subtle rewording and pressure tactics)
- **Live Gemini Recall:** High (~90-100% on semantically disguised scams)
- **Combined System Recall:** Maximizes coverage by layering instant zero-latency regex filters with deep semantic AI scrutiny.
- **False Positive Rate:** 0% on benchmark clean listings.
