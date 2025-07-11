# Product Requirements Document: Fed Scenario Modeling Utility

**Author:** Gemini
**Date:** July 11, 2025
**Version:** 5.1

## 1. Introduction & Problem Statement

In a complex economic environment, institutional investors, macro traders, and policy professionals need sophisticated tools to contextualize current conditions and generate actionable trading recommendations based on Federal Reserve policy cycles. The interplay of key indicators like unemployment, inflation, and the Federal Funds Rate drives both monetary policy and market movements across asset classes.

This document outlines the requirements for a professional-grade, command-line utility that empowers users to analyze historical economic data, identify periods analogous to the present, model potential Fed actions, and generate institutional-quality trading recommendations with specific entry/exit levels, position sizing, and risk management.

The evolved use case is to transform Fed policy analysis into actionable trading intelligence with quantified risk management for professional macro trading strategies.

## 2. Goals & Objectives

* **Primary Goal:** To provide institutional-grade trading intelligence that transforms Fed policy analysis into actionable investment recommendations with quantified risk management.
* **Objectives:**
  * To aggregate and store comprehensive economic and market data locally for professional analysis.
  * To provide sophisticated CLI interfaces for complex economic scenario modeling and trading strategy development.
  * To implement advanced analysis engines using similarity algorithms, scenario analysis, and backtesting frameworks.
  * To generate professional trading recommendations with specific entry/exit levels, position sizing, and hedging strategies.
  * To deliver comprehensive risk management including Value-at-Risk, stress testing, and portfolio optimization.
  * To provide institutional-quality performance attribution and backtesting capabilities.

## 3. Target Audience

The primary users are sophisticated financial professionals including:
* **Macro Traders** - Portfolio managers and traders executing Fed-driven strategies
* **Hedge Fund Analysts** - Research professionals developing institutional trading strategies  
* **Investment Banks** - Fixed income and rates trading desks
* **Asset Managers** - Multi-asset portfolio managers positioning around Fed cycles
* **Economic Researchers** - Policy analysts requiring actionable market intelligence
* **Risk Managers** - Professionals needing quantified Fed policy risk assessment

All users are expected to be comfortable with terminal environments and sophisticated financial concepts.

## 4. Core Features

### 4.1. Data Ingestion and Management
The utility must be able to fetch and store historical economic data from reliable public sources.

**4.1.1. Expanded Data Points**
The utility will support a larger set of core economic indicators from FRED, including:
*   **Unemployment Rate:** `UNRATE`
*   **Consumer Price Index (CPI):** `CPIAUCSL` (YoY % change calculated)
*   **Effective Federal Funds Rate:** `DFF`
*   **Core PCE Inflation:** `PCEPI` (YoY % change calculated)
*   **Real GDP Growth:** `GDPC1` (YoY % change calculated)
*   **Yield Curve Spread:** `T10Y2Y` (10-Year minus 2-Year Treasury)
*   **Initial Jobless Claims:** `ICSA`

**4.1.2. Data Sources**
Data will be fetched via APIs from sources like the Federal Reserve Economic Data (FRED) database provided by the St. Louis Fed.

**4.1.3. Flexible Local Storage**
Data will be stored in a local SQLite database. The schema will be designed to accommodate adding new indicators in the future without requiring a full database migration.

**4.1.4. Data Update Command**
A specific command (`fed-analyzer update-data`) will trigger a fetch for the latest available data for all supported indicators and append it to the local database.

### 4.2. Interactive CLI (Built with Ink)
The user interface will be a rich, interactive application that runs within the terminal.

**4.2.1. Flexible Scenario Definition**
The user will define a scenario via command-line flags, specifying which indicators to use and their relative importance (weight). This allows for highly customized analysis.

**4.2.2. Command Structure Example**
```bash
fed-analyzer analyze \
  --indicator UNRATE:0.4 \
  --indicator CPIAUCSL:0.4 \
  --indicator T10Y2Y:0.2 \
  --months 12
```

### 4.3. Historical Analogue Engine
This is the core analysis engine of the utility. It moves beyond simple range-matching to find the most statistically relevant historical comparisons.

**4.3.1. Weighted Multi-Variable Analysis**
The engine will take the user-defined basket of indicators and their weights to create a composite vector for comparison. This ensures the similarity score reflects the user's analytical priorities.

**4.3.2. Similarity Algorithms**
Implements sophisticated comparison methods to measure the similarity between the target scenario and past periods across the selected basket of indicators.
*   **Dynamic Time Warping (DTW):** For comparing the trajectory of time-series data, even if they are out of phase.

**4.3.3. Automated Ranking**
The tool will process historical data to find the top 5-10 most analogous periods, presenting them in a ranked list with a "similarity score" derived from the chosen algorithm and weighting.

### 4.4. Automated Analogue Reports & Visualization
Once matching historical analogues are found, they will be displayed in a clear, rich, terminal-based report.

**4.4.1. Ranked List of Analogues**
The view will list the date ranges of all matching periods (e.g., "March 1995 - September 1995") ranked by their similarity score.

**4.4.2. Dynamic Automated Reports**
For each top-ranked analogue, the tool will generate a detailed report containing:
*   **Dynamic Data Charts:** A compact, terminal-rendered chart will be displayed for *each indicator* included in the analysis.
*   **Fed Policy Action Timeline:** A clear timeline illustrating the sequence and magnitude of Federal Funds Rate changes (e.g., `▲ +25bps`, `▼ -50bps`, `— HOLD`) that occurred during and immediately after the analogue period.

## 5. Technical Requirements

* **Platform:** macOS
* **Language:** TypeScript
* **Framework:** Node.js, Ink (for CLI UI)
* **Database:** SQLite
* **Dependencies:** A library for API calls (e.g., `node-fetch`), a SQLite driver (e.g., `sqlite3`), and a CLI argument parser (e.g., `yargs`).

## 6. Assumptions & Constraints

* The utility is for local, single-user operation. No server or cloud component is required.
* The accuracy of the analysis is dependent on the availability and quality of public data from FRED.
* The simulation is a simplified model based on historical correlation and does not constitute financial advice. It is a tool for exploration, not prediction.

## 7. Future Enhancement Opportunities

Based on comprehensive user evaluation, query testing, and analysis of real-world usage patterns, the following improvement areas have been identified:

### 7.1. **CRITICAL ALGORITHM FIXES** *(High Priority - Core Functionality)*
* ~~**Fed Policy Action Filtering**: Implement intelligent filtering to remove daily noise from Fed Funds Rate data~~ **[COMPLETED]**
* **Overlapping Period Prevention**: Enforce minimum time gap (6+ months) between returned analogues to eliminate redundant results
* **Historical Diversity Scoring**: Add algorithmic bias toward temporally diverse results spanning different economic eras
* **Improved Normalization**: Fix windowed normalization that currently removes meaningful data variation, causing flat chart displays
* **Data Quality Filtering**: Exclude unreliable early FRED data (pre-1960s) showing impossible Fed policy volatility

### 7.2. **USER EXPERIENCE BREAKTHROUGHS** *(High Priority - Product Value)*
* **Period Exclusion Controls**: Allow users to exclude recent periods ("last 5 years") or specify historical focus eras
* **Economic Regime Templates**: Pre-built scenarios like "Stagflation Hunt", "Financial Crisis Patterns", "Policy Tightening Cycles"
* **Interactive Target Period Selection**: Let users analyze any historical period, not just recent months
* **Multi-Period Regime Comparison**: Compare current conditions against multiple distinct historical eras simultaneously
* **Historical Context Enrichment**: Overlay recession dates, major policy shifts, and crisis markers on timelines

### 7.3. **ADVANCED ANALYTICAL CAPABILITIES** *(Medium Priority - Power User Features)*
* **Regime Detection Engine**: Automatically identify distinct economic periods ("High Inflation Era", "ZIRP Period", etc.)
* **Confidence & Quality Indicators**: Statistical bounds around similarity scores with data reliability warnings
* **Trend Direction Analysis**: Show directional changes (rising/falling patterns) rather than just absolute levels
* **Scenario Persistence & Sharing**: Save/load/export scenario definitions for research collaboration
* **Batch Analysis Workflows**: Run multiple scenarios automatically and generate comparative reports

### 7.4. **DATA & VISUALIZATION ENHANCEMENTS** *(Medium Priority - Analytical Depth)*
* **Extended Historical Coverage**: Integrate additional pre-1950s data sources for longer-term perspective
* **Dynamic Chart Scaling**: Resolve normalization issues to display meaningful variation instead of flat lines
* **Economic Context Annotations**: Automatically label major economic events and policy regime changes
* **Multi-Scale Time Analysis**: Support analysis across different time horizons (quarterly, annual, multi-year cycles)

### 7.5. **TECHNICAL INFRASTRUCTURE** *(Lower Priority - Platform Improvements)*
* ~~**Node.js Deprecation Fixes**: Update build system warnings~~ **[COMPLETED]**
* ~~**Test Suite Enhancement**: Fix failing tests~~ **[COMPLETED]**
* **Performance Optimization**: Implement caching for DTW calculations and optimize database queries
* **Export Functionality**: Add CSV/JSON export with analysis metadata
* **API Rate Limiting**: Implement graceful FRED API handling with retry logic

### 7.6. **FED POLICY ANALYSIS ENHANCEMENTS** *(Critical Priority - Core Value Proposition)*

These enhancements directly address the primary goal of understanding and simulating Federal Reserve monetary policy decisions:

#### 7.6.1. **Fed Policy Response Analyzer**
* **Policy Pattern Recognition**: Automatically categorize Fed response patterns (e.g., "Aggressive easing", "Gradual tightening", "Data-dependent pause")
* **Response Timing Analysis**: Calculate and display lag between economic triggers and Fed actions
* **Policy Effectiveness Tracking**: Show how indicators responded to Fed interventions
* **Historical Success Metrics**: Rate the effectiveness of past Fed responses in similar conditions

#### 7.6.2. **Interactive Policy Simulator**
* **What-If Scenarios**: Allow users to simulate different Fed actions and see projected outcomes
* **Policy Comparison Mode**: Compare effectiveness of different policy approaches side-by-side
* **Confidence Intervals**: Show statistical bounds on policy outcome predictions
* **Real-time Adjustment**: Update projections as users modify Fed action assumptions

#### 7.6.3. **Fed Reaction Function Dashboard**
* **Policy Trigger Indicators**: Visual display of current values vs historical Fed action thresholds
* **Rate Change Probability**: Calculate likelihood of Fed moves based on historical patterns
* **Policy Pressure Gauge**: Composite indicator showing overall pressure for tightening/easing
* **Decision Timeline**: Projected FOMC meeting outcomes based on current trajectory

#### 7.6.4. **Policy Playbook Generator**
* **Historical Playbooks**: Extract step-by-step Fed response patterns from analogues
* **Market Expectations Analysis**: Compare Fed actions to contemporary market predictions
* **Policy Rationale Extraction**: Identify key concerns driving Fed decisions
* **Communication Pattern Analysis**: Track Fed rhetoric changes preceding policy shifts

#### 7.6.5. **Enhanced Policy Timeline Visualization**
* **Pre-Decision Context**: Show 3-6 months of data preceding each Fed action
* **Cumulative Impact Tracking**: Running total of policy changes with economic context
* **Policy Regime Identification**: Auto-label easing/tightening/neutral periods
* **Meeting-by-Meeting Analysis**: Detailed view of each FOMC decision point

#### 7.6.6. **Forward Guidance Analyzer**
* **Policy Path Projection**: 6-12 month Fed action forecast based on historical precedent
* **Scenario Probability Distribution**: Show likelihood of various policy paths
* **Key Data Dependencies**: Highlight upcoming releases that could alter projections
* **Historical Accuracy Scoring**: Track how well past analogues predicted Fed actions

#### 7.6.7. **Policy Impact Scorecard**
* **Indicator Response Profiles**: How each metric typically reacts to Fed moves
* **Lag Analysis**: Time to policy effectiveness for different indicators
* **Dual Mandate Scoring**: Success rate in achieving employment/inflation goals
* **Unintended Consequences**: Historical side effects of similar policies

#### 7.6.8. **Policy Prescription Summary**
* **Most Likely Fed Response**: Primary policy recommendation with confidence level
* **Alternative Scenarios**: Other plausible Fed reactions with probabilities
* **Critical Thresholds**: Specific indicator levels that would trigger action
* **Risk Assessment**: Factors that could make current situation unique

### 7.7. **INSTITUTIONAL TRADING INTELLIGENCE** *(Critical Priority - Professional Trading Platform)*

#### 7.7.1. **Trading Recommendation Engine** *(COMPLETED v5.1)*
* **Specific Entry/Exit Levels**: Technical analysis with support/resistance and volatility-based pricing
* **Risk-Adjusted Position Sizing**: Kelly Criterion, volatility-adjusted, and risk parity methodologies  
* **Comprehensive Hedging Strategies**: Duration, curve, volatility, and cross-asset hedge recommendations
* **Monte Carlo P&L Analysis**: 1000+ simulation scenarios with Value-at-Risk calculations
* **Professional Trading Dashboard**: Institutional-grade UI with trade cards, portfolio summary, and risk metrics

#### 7.7.2. **Advanced Risk Management** *(COMPLETED v5.1)*
* **Position Sizing Framework**: Multiple methodologies (Kelly, volatility-adjusted, risk parity, correlation-adjusted)
* **Portfolio Risk Budgeting**: Sector concentration limits, maximum drawdown constraints, correlation adjustments
* **Scenario Analysis Service**: Monte Carlo simulation, stress testing, regime-specific correlations
* **Hedging Service**: Systematic hedge generation for duration, curve, volatility, and cross-asset risks
* **Backtesting Framework**: Historical performance validation with Sharpe ratios, win rates, regime analysis

#### 7.7.3. **Market Integration Platform** *(COMPLETED v5.0)*
* **Market Expectations Dashboard**: Fed dot plot vs market-implied rates with divergence analysis
* **Cross-Asset Fed Playbook**: Multi-asset performance tracking across historical Fed cycles
* **Yield Curve Analysis**: Real-time inversion detection with recession risk warnings
* **Trading Signal Generation**: Risk-adjusted BUY/SELL/HOLD signals with confidence scoring
* **ETF Performance Analytics**: Historical performance patterns during analogous Fed periods

#### 7.7.4. **Future Professional Features** *(Roadmap)*
* **Real-time Market Data**: Live pricing integration for institutional-grade execution
* **Portfolio Management**: Multi-strategy portfolio construction and optimization
* **Execution Analytics**: Transaction cost analysis and market impact modeling
* **Client Reporting**: Institutional-quality performance and attribution reporting
* **API Integration**: Systematic trading system connectivity

### 7.8. **PRODUCT INTELLIGENCE** *(Future Vision - Advanced Research Platform)*
* **Scenario Forecasting**: Extend historical analogues to project potential future economic paths
* **Advanced ML Integration**: Deep learning pattern recognition for policy predictions
* **Real-time Alert System**: Notify when current conditions match historically significant periods
* **Economic Research Integration**: Connect with academic datasets and policy research databases
* **Natural Language Query Interface**: Allow researchers to ask questions in plain English