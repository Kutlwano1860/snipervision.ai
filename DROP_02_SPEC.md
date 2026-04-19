# SniperVision.AI — Drop 02 Feature Spec
**Codename: The Trading OS**
*Planned next major release after Drop 01 (current build)*

---

## Vision
Turn SniperVision from a chart analysis tool into a full trading management platform.
The core concept: one system, three operating modes, each with its own journal, rules, and progress tracking.

---

## 1. Trading Mode Switcher

### Concept
A persistent tab/toggle at the top of the dashboard that switches the entire context of the app.

```
[ 📊 Normal ]  [ 🏢 Prop Firm ]  [ ⚔️ Challenge ]
```

### Behaviour per mode
| Mode | Account Used | Journal | AI Rules Layer | Extras |
|---|---|---|---|---|
| Normal | Normal account | Normal journal | Standard analysis | 3-account switching |
| Prop Firm | Prop firm account | Prop journal | Firm rules overlay | Drawdown alerts, compliance |
| Challenge | Challenge account | Challenge journal | Challenge rules | Compound tracker, badges |

### Account mapping (one per mode)
- **Normal** → the user's regular live/demo account
- **Prop Firm** → the funded/prop account (FTMO, The5ers, etc.)
- **Challenge** → a virtual starting balance for the SniperVision compound challenge

### DB changes needed
- `profiles.active_mode` column: `'normal' | 'prop' | 'challenge'`
- Each `journal_entries` row already has `user_id` — add `mode` column to filter by context
- `challenge_sessions` table (see section 3)

---

## 2. Prop Firm Mode

### Activation
User selects their prop firm from a list (or enters custom rules). The AI analysis and journal adapt automatically.

### Supported firms (initial list)
- FTMO
- MyForexFunds
- The Funded Trader
- E8 Funding
- Apex Trader Funding
- Custom (user enters their own rules manually)

### Rules engine — what gets enforced
| Rule | What it does |
|---|---|
| **Daily drawdown limit** | Caution banner when daily P&L approaches limit. Hard warning at 80%, red alert at 95%. |
| **Max drawdown limit** | Running total of peak-to-trough losses. Alert if approaching account max DD. |
| **Consistency rule** | No single trade should be more than a set % of total profits. System flags if a trade would violate this. |
| **Minimum trading days** | Tracks how many days the user has traded. Shows progress toward minimum required. |
| **News blackout** | Option to flag high-impact news events and warn user not to enter within X minutes. |
| **Profit target** | Tracks progress toward the firm's required profit % to pass the challenge. |

### AI analysis changes in Prop Firm mode
When scanning in this mode, the prompt includes:
- "User is on a prop firm challenge — flag any setup that risks violating consistency rule"
- "Max daily drawdown: X%. Current day P&L: Y. Warn if this trade risks breach."
- "Minimum trading days required: X. User has traded Y days."
- Analysis output gets a **PROP COMPLIANCE** section showing green/amber/red for each rule

### Prop Firm Journal
Same structure as normal journal but:
- Shows compliance status per trade (did this trade violate any rule?)
- Running totals for drawdown, profit target progress, trading days
- A dedicated **Dashboard** tab within the journal showing pass/fail status for all firm rules

---

## 3. SniperVision Challenge (Compound Mode)

### Concept
A gamified compound trading challenge the user sets up themselves. The system tracks their progress accurately day by day.

### Setup (user selects at start)
| Field | Options |
|---|---|
| Starting balance | Any amount (e.g. R1,000 / $100) |
| Daily target % | 1% / 2% / 3% / 5% / custom |
| Number of days | 10 / 20 / 30 / 60 / 90 / custom |
| Risk per trade | 0.5% / 1% / 2% / custom |
| Challenge currency | Any supported currency |

### Compound calculation formula
```
Day 0:  Starting balance = B
Day N:  Balance = B × (1 + daily_target%)^N

Example: R1,000 at 2%/day for 30 days
Day 30: 1000 × (1.02)^30 = R1,811.36

The system shows:
- Target balance per day (what you SHOULD have)
- Actual balance (what you DO have, from journal P&L)
- Variance (ahead / behind target)
- % completion of the challenge
```

### Challenge Journal
- Same card/row format as normal journal
- Extra columns: Day #, Target Balance, Actual Balance, Variance
- Progress bar at top showing X/N days completed, current % gain vs target

### Challenge Dashboard widget
- Big number: current balance
- Target for today
- Days remaining
- Compound curve chart (target line vs actual line)
- Status badge: ON TRACK / AHEAD / BEHIND / FAILED

### Challenge states
| State | Condition |
|---|---|
| Active | Days remaining > 0, still within parameters |
| Completed | All days done, target hit or exceeded |
| Failed | Balance drops below a set floor (e.g. 10% drawdown from start) |
| Abandoned | User cancels manually |

### Shareable Challenge Card
When a milestone is hit (Day 10, Day 20, completed), the user gets a shareable card showing:
- Their username / handle
- Challenge day X of Y
- Current P&L %
- SniperVision branding
- Can be downloaded as an image or shared directly

---

## 4. Badge System

### How it works
- Badges are earned automatically when conditions are met
- Displayed on the user's community profile
- Shown in a dedicated "Achievements" panel on the settings/profile page
- Some badges are exclusive to premium/diamond tiers

### Badge categories

#### 🎯 Challenge Badges
| Badge | Icon | Condition |
|---|---|---|
| First Blood | 🩸 | Complete your first challenge day with a profit |
| On Fire | 🔥 | 5 consecutive green challenge days |
| Compounder | 📈 | 10 consecutive green challenge days |
| Diamond Hands | 💎 | Complete a 30-day challenge |
| Century | 💯 | Complete a 100-day challenge |
| To The Moon | 🚀 | Double your account in any challenge |
| Sniper | ⚡ | Hit daily target with only 1 trade |
| Comeback King | 👑 | Recover from 50%+ drawdown to complete a challenge |

#### 📊 Performance Badges
| Badge | Icon | Condition |
|---|---|---|
| Consistent | 🎖️ | Win rate above 60% for any full month |
| Sharp Shooter | 🎯 | Win rate above 75% for a week (min 5 trades) |
| Risk Manager | 🛡️ | Never exceeded risk % in a full month |
| Disciplined | 🧠 | Traded only during kill zones for a full week |
| Clean Sheet | ✅ | Full week with zero losses |
| Patient | ⏳ | Skipped 3+ trades in a row, then took a winner |

#### 🏢 Prop Firm Badges
| Badge | Icon | Condition |
|---|---|---|
| Funded Ready | 🏆 | Zero rule violations for 2 full weeks in prop mode |
| Rule Keeper | 📋 | Completed a full prop challenge with no violations |
| Prop Passer | 🎓 | User manually marks a prop challenge as passed |
| Iron Discipline | 🔩 | 30 days in prop mode, daily DD never exceeded 50% of limit |

#### 🌟 Platform Badges
| Badge | Icon | Condition |
|---|---|---|
| Early Adopter | 🌱 | Joined during launch period |
| Community Voice | 💬 | Posted 50+ messages in community |
| Leaderboard | 🏅 | Appeared in top 10 of strategy leaderboard |
| Veteran | 🎗️ | Active on platform for 6+ months |

---

## 5. Performance Recaps

### Weekly Recap
Triggered every Monday (or manually from journal). Shows:
- Trades taken that week
- Win rate
- Total P&L (home currency)
- Best trade (asset + amount)
- Worst trade (asset + amount)
- Average R:R
- Status: ✅ Profitable / ⚠️ Break-even / ❌ Loss Week

### Monthly Recap
- All the above + week-by-week breakdown
- Best week vs worst week
- Strategy performance (which strategy had best win rate)
- Most traded pair
- Consistency score (how regular was trading)

### Yearly Recap
- Month-by-month heatmap calendar (green = profitable month, red = loss month)
- Total P&L for the year
- Best month, worst month
- Overall win rate
- Total trades taken
- Net growth % on account

### Recap delivery
- Shows as a modal/overlay when user opens the journal at start of new period
- Can be dismissed and viewed again from journal header
- Premium+ users get a beautiful visual recap card (same style as challenge card)
- Diamond users get an AI-written narrative summary of their year

---

## 6. UI Flow Summary

```
Dashboard Header:
┌─────────────────────────────────────────────────────┐
│  [ 📊 Normal ] [ 🏢 Prop Firm ] [ ⚔️ Challenge ]    │
│  Mode: PROP FIRM · FTMO · Day 8/30 · ✅ On Track    │
└─────────────────────────────────────────────────────┘

Analyse page adapts per mode:
- Normal:     Standard scan
- Prop Firm:  Scan + PROP COMPLIANCE section in results
- Challenge:  Scan + CHALLENGE IMPACT (how this trade affects day target)

Journal page adapts per mode:
- Normal:     Standard journal
- Prop Firm:  Journal + Compliance sidebar + Firm rules dashboard
- Challenge:  Journal + Compound tracker + Day progress bar
```

---

## 7. Build Priority

| Priority | Feature | Complexity | Impact |
|---|---|---|---|
| 1st | Mode switcher UI + DB `mode` column on journal | Low | High |
| 1st | Challenge setup + compound calculator | Medium | Very High |
| 1st | Challenge journal + progress tracker | Medium | Very High |
| 2nd | Badge system (conditions + display) | Medium | High |
| 2nd | Weekly recap | Medium | High |
| 2nd | Prop firm mode — rules engine | High | High |
| 3rd | Monthly + yearly recap | Medium | Medium |
| 3rd | Shareable challenge card (image export) | Medium | High (viral) |
| 3rd | AI narrative recap (Diamond tier) | Low | Medium |

---

## 8. Subscription Gating

| Feature | Free | Premium | Platinum | Diamond |
|---|---|---|---|---|
| Normal mode | ✅ | ✅ | ✅ | ✅ |
| Challenge mode | ✅ (1 active) | ✅ (3 active) | ✅ unlimited | ✅ unlimited |
| Prop firm mode | ❌ | ✅ | ✅ | ✅ |
| Badges (basic) | ✅ | ✅ | ✅ | ✅ |
| Badges (exclusive) | ❌ | ❌ | ✅ | ✅ |
| Weekly recap | ❌ | ✅ | ✅ | ✅ |
| Monthly recap | ❌ | ❌ | ✅ | ✅ |
| Yearly recap + heatmap | ❌ | ❌ | ✅ | ✅ |
| Shareable cards | ❌ | ✅ | ✅ | ✅ |
| AI narrative recap | ❌ | ❌ | ❌ | ✅ |

---

*Last updated: Drop 01 build session — ready to build when Drop 02 kicks off.*
