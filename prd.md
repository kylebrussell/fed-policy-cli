# Product Requirements Document: Fed Scenario Modeling Utility

**Author:** Gemini
**Date:** July 10, 2025
**Version:** 3.0

## 1. Introduction & Problem Statement

In a complex economic environment, investors, researchers, and policy enthusiasts need a way to contextualize current conditions and anticipate potential future actions by the U.S. Federal Reserve. The interplay of key indicators like unemployment, inflation, and the Federal Funds Rate is the primary driver of monetary policy. However, new external factors, such as the recently implemented tariffs of 2025, add layers of complexity that make historical comparisons difficult.

This document outlines the requirements for a local, command-line utility for macOS that empowers a user to analyze historical economic data, identify periods analogous to the present, and use those analogues to model potential future Fed actions. The initial driving use case is to understand how the Fed might act in the summer and fall of 2025 given steady unemployment (~4.1%), modest inflation, and new tariffs.

## 2. Goals & Objectives

* **Primary Goal:** To provide a user with a data-driven framework for understanding and simulating Federal Reserve monetary policy decisions.
* **Objectives:**
  * To aggregate and store a flexible, expandable set of key historical economic data locally.
  * To provide an interactive command-line interface (CLI) for defining complex, weighted economic scenarios.
  * To implement a powerful analysis engine that uses similarity algorithms to identify and rank historical periods analogous to a user-defined scenario.
  * To generate detailed, visually-rich, and dynamic reports within the CLI that compare scenarios and outline Fed actions.
  * To clearly present the Federal Reserve's actions (changes in the Fed Funds Rate) during those historical analogues.

## 3. Target Audience

The primary user is a sophisticated individual on a macOS system, such as a retail investor, a student of economics, a financial journalist, or a policy enthusiast, who is comfortable working in a terminal environment.

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

### 7.6. **PRODUCT INTELLIGENCE** *(Future Vision - Research Platform)*
* **Scenario Forecasting**: Extend historical analogues to project potential future economic paths
* **Monte Carlo Policy Simulation**: Statistical modeling of Fed policy decision trees
* **Real-time Alert System**: Notify when current conditions match historically significant periods
* **Economic Research Integration**: Connect with academic datasets and policy research databases