# Product Requirements Document: Fed Scenario Modeling Utility

**Author:** Gemini
**Date:** July 10, 2025
**Version:** 1.2

## 1. Introduction & Problem Statement

In a complex economic environment, investors, researchers, and policy enthusiasts need a way to contextualize current conditions and anticipate potential future actions by the U.S. Federal Reserve. The interplay of key indicators like unemployment, inflation, and the Federal Funds Rate is the primary driver of monetary policy. However, new external factors, such as the recently implemented tariffs of 2025, add layers of complexity that make historical comparisons difficult.

This document outlines the requirements for a local, command-line utility for macOS that empowers a user to analyze historical economic data, identify periods analogous to the present, and use those analogues to model potential future Fed actions. The initial driving use case is to understand how the Fed might act in the summer and fall of 2025 given steady unemployment (~4.1%), modest inflation, and new tariffs.

## 2. Goals & Objectives

* **Primary Goal:** To provide a user with a data-driven framework for understanding and simulating Federal Reserve monetary policy decisions.
* **Objectives:**
  * To aggregate and store key historical economic data locally.
  * To provide an interactive command-line interface (CLI) for defining economic scenarios.
  * To programmatically identify and display historical periods that match a user-defined scenario.
  * To clearly present the Federal Reserve's actions (changes in the Fed Funds Rate) during those historical analogues.
  * To generate a simple, probabilistic summary of potential future Fed actions based on the historical findings.

## 3. Target Audience

The primary user is a sophisticated individual on a macOS system, such as a retail investor, a student of economics, a financial journalist, or a policy enthusiast, who is comfortable working in a terminal environment.

## 4. Core Features

### 4.1. Data Ingestion and Management
The utility must be able to fetch and store historical economic data from reliable public sources.

**4.1.1. Data Points**
The initial version will focus on the following monthly data:
* **Unemployment Rate:** (e.g., UNRATE from FRED)
* **Consumer Price Index (CPI):** Year-over-year percentage change (e.g., CPIAUCSL from FRED)
* **Effective Federal Funds Rate:** (e.g., DFF from FRED)

**4.1.2. Data Sources**
Data will be fetched via APIs from sources like the Federal Reserve Economic Data (FRED) database provided by the St. Louis Fed and the Bureau of Labor Statistics (BLS).

**4.1.3. Local Storage**
Data will be stored in a local SQLite database to ensure fast, offline access after the initial fetch.

**4.1.4. Data Update Command**
A specific command (`fed-analyzer update-data`) will trigger a fetch for the latest available data and append it to the local database.

### 4.2. Interactive CLI (Built with Ink)
The user interface will be a rich, interactive application that runs within the terminal.

**4.2.1. Main Dashboard**
Upon launch, the tool will display the most recent values for the core economic indicators stored in its database.

**4.2.2. Scenario Definition**
The user will be presented with an interactive form to define the parameters of a scenario they wish to analyze. For example:
* Unemployment Rate Range (e.g., 4.0% to 4.5%)
* Inflation (CPI) Range (e.g., 2.5% to 3.5%)
* Time Window for Averaging (e.g., analyze 6-month historical windows)
* Qualitative Factors (e.g., a checkbox for "Period of new/rising tariffs")

### 4.3. Historical Analogue Finder
This is the core analysis engine of the utility.

**4.3.1. Querying**
Based on the user's scenario input, the tool will query the local SQLite database.

**4.3.2. Matching Logic**
It will identify all historical time windows (e.g., consecutive 6-month periods) where the average values for unemployment and inflation fell within the user-specified ranges.

**4.3.3. Tariff Context**
If the "tariffs" flag is checked, the tool will attempt to cross-reference matched periods with a hardcoded list of significant historical tariff acts (e.g., Smoot-Hawley, 2018-2019 tariffs).

### 4.4. Analogue Analysis View
Once matching historical analogues are found, they will be displayed in a clear, readable format.

**4.4.1. List of Analogues**
The view will list the date ranges of all matching periods (e.g., "March 1995 - September 1995").

**4.4.2. Detailed Breakdown**
For each analogue period, the tool will display:
* The average unemployment and inflation during that window.
* The Fed Funds Rate at the *start* of the window.
* The Fed Funds Rate at the *end* of the window.
* A clear, color-coded indicator of the net action: **HIKE** (red), **CUT** (green), or **HOLD** (yellow).

### 4.5. Simulation Summary
After displaying the analogues, the tool will provide a simple probabilistic summary.

**4.5.1. Aggregated Results**
It will count the outcomes from the analogue analysis.

**4.5.2. Output**
The summary will be presented to the user, for example:
> Based on 5 historical analogues found:
> * The Fed executed a rate **HIKE** in 3 instances (60%).
> * The Fed chose to **HOLD** rates in 2 instances (40%).
> * The Fed executed a rate **CUT** in 0 instances (0%).

## 5. Technical Requirements

* **Platform:** macOS
* **Language:** TypeScript
* **Framework:** Node.js, Ink (for CLI UI)
* **Database:** SQLite
* **Dependencies:** A library for API calls (e.g., `node-fetch`), a SQLite driver (e.g., `sqlite3`), and a CLI argument parser (e.g., `yargs`).

## 6. Assumptions & Constraints

* The utility is for local, single-user operation. No server or cloud component is required.
* The accuracy of the analysis is dependent on the availability and quality of public data from FRED/BLS.
* The simulation is a simplified model based on historical correlation and does not constitute financial advice. It is a tool for exploration, not prediction.
* The initial version will focus on a limited set of economic indicators. More can be added later.