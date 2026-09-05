document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("financial-form");
  const loadSampleBtn = document.getElementById("load-sample-btn");
  const resetBtn = document.getElementById("reset-btn");

  let benchmarkChart = null;

  // Realistic sample data of a growing manufacturing/trading SME
  const sampleData = {
    currentAssets: 450000,
    currentLiabilities: 280000,
    cashEquivalents: 75000,
    revenue: 1200000,
    cogs: 720000,
    operatingExpenses: 310000,
    netIncome: 110000,
    totalAssets: 850000,
    totalDebt: 320000,
    totalEquity: 420000,
    interestExpense: 25000,
    operatingCashFlow: 140000,
    capEx: 45000
  };

  // Populate form with sample data
  loadSampleBtn.addEventListener("click", () => {
    Object.keys(sampleData).forEach((key) => {
      const input = document.getElementById(key);
      if (input) input.value = sampleData[key];
    });
    calculateAssessment();
  });

  // Reset form
  resetBtn.addEventListener("click", () => {
    form.reset();
    resetOutputs();
  });

  // Handle Form Submission
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    calculateAssessment();
  });

  function calculateAssessment() {
    // 1. Fetch values
    const ca = parseFloat(document.getElementById("currentAssets").value) || 0;
    const cl = parseFloat(document.getElementById("currentLiabilities").value) || 0;
    const cash = parseFloat(document.getElementById("cashEquivalents").value) || 0;
    const rev = parseFloat(document.getElementById("revenue").value) || 0;
    const cogs = parseFloat(document.getElementById("cogs").value) || 0;
    const opex = parseFloat(document.getElementById("operatingExpenses").value) || 0;
    const ni = parseFloat(document.getElementById("netIncome").value) || 0;
    const ta = parseFloat(document.getElementById("totalAssets").value) || 0;
    const td = parseFloat(document.getElementById("totalDebt").value) || 0;
    const te = parseFloat(document.getElementById("totalEquity").value) || 0;
    const ie = parseFloat(document.getElementById("interestExpense").value) || 0;
    const ocf = parseFloat(document.getElementById("operatingCashFlow").value) || 0;
    const capex = parseFloat(document.getElementById("capEx").value) || 0;

    if (ta === 0 || cl === 0) {
      alert("Total Assets and Current Liabilities must be greater than zero.");
      return;
    }

    // 2. Calculations
    const workingCapital = ca - cl;
    const ebit = rev - cogs - opex; // Operating Income proxy
    const currentRatio = cl > 0 ? ca / cl : 0;
    const quickRatio = cl > 0 ? (cash + (ca * 0.4)) / cl : 0; // Quick assets approximation
    const netProfitMargin = rev > 0 ? (ni / rev) * 100 : 0;
    const roa = ta > 0 ? (ni / ta) * 100 : 0;
    const deRatio = te > 0 ? td / te : 0;
    const icr = ie > 0 ? ebit / ie : ebit > 0 ? 99 : 0;
    const ocfDebtRatio = td > 0 ? ocf / td : 0;
    const freeCashFlow = ocf - capex;

    // 3. Altman Z'-Score for Private/Non-manufacturing SMEs
    // Z' = 6.56(X1) + 3.26(X2) + 6.72(X3) + 1.05(X4)
    const x1 = workingCapital / ta;
    const x2 = ni / ta; // Retained earnings proxy
    const x3 = ebit / ta;
    const x4 = te / (td || 1);

    const zScore = (6.56 * x1) + (3.26 * x2) + (6.72 * x3) + (1.05 * x4);

    // 4. Update UI Displays
    updateScorecard({
      currentRatio,
      quickRatio,
      netProfitMargin,
      roa,
      deRatio,
      icr,
      ocfDebtRatio,
      freeCashFlow,
      zScore
    });

    // 5. Update Risk Band
    updateRiskBadge(zScore);

    // 6. Generate Recommendations
    generateRecommendations({
      currentRatio,
      quickRatio,
      netProfitMargin,
      deRatio,
      icr,
      ocfDebtRatio,
      freeCashFlow,
      zScore
    });

    // 7. Update Chart
    renderChart(currentRatio, quickRatio, netProfitMargin, roa, deRatio, icr);
  }

  function updateScorecard(metrics) {
    document.getElementById("z-score-val").textContent = metrics.zScore.toFixed(2);
    document.getElementById("kpi-current-ratio").textContent = metrics.currentRatio.toFixed(2);
    document.getElementById("kpi-quick-ratio").textContent = metrics.quickRatio.toFixed(2);
    document.getElementById("kpi-net-margin").textContent = `${metrics.netProfitMargin.toFixed(1)}%`;
    document.getElementById("kpi-roa").textContent = `${metrics.roa.toFixed(1)}%`;
    document.getElementById("kpi-de-ratio").textContent = metrics.deRatio.toFixed(2);
    document.getElementById("kpi-icr").textContent = metrics.icr > 50 ? ">50x" : `${metrics.icr.toFixed(1)}x`;
    document.getElementById("kpi-ocf-debt").textContent = metrics.ocfDebtRatio.toFixed(2);
    document.getElementById("kpi-fcf").textContent = `$${Math.round(metrics.freeCashFlow).toLocaleString()}`;
  }

  function updateRiskBadge(z) {
    const badge = document.getElementById("risk-badge");
    badge.className = "badge";

    if (z > 2.9) {
      badge.textContent = "Safe Zone (Low Risk)";
      badge.classList.add("badge-safe");
    } else if (z >= 1.23 && z <= 2.9) {
      badge.textContent = "Grey Zone (Moderate Risk)";
      badge.classList.add("badge-grey");
    } else {
      badge.textContent = "Distress Zone (High Risk)";
      badge.classList.add("badge-distress");
    }
  }

  function generateRecommendations(m) {
    const list = document.getElementById("advisory-list");
    list.innerHTML = "";
    const recs = [];

    // Liquidity warnings
    if (m.currentRatio < 1.3) {
      recs.push("Working Capital Strain: Current Ratio is below the 1.5 standard. Optimize short-term receivables collection and lengthen supplier credit terms to avoid liquidity bottlenecks.");
    }
    // Debt & Solvency warnings
    if (m.deRatio > 2.0) {
      recs.push("High Leverage: Debt-to-Equity exceeds 2.0. The firm is heavily reliant on creditor capital, increasing sensitivity to rate hikes.");
    }
    // Interest coverage
    if (m.icr < 2.0) {
      recs.push("Debt Service Vulnerability: Interest Coverage Ratio is below 2.0x, indicating narrow operating margins to service existing bank loans.");
    }
    // Cash flow health
    if (m.freeCashFlow < 0) {
      recs.push("Negative Free Cash Flow: Capital expenditures exceed operational cash flow. Re-evaluate ongoing CapEx timing to prevent reliance on short-term debt.");
    }
    // Overall Z-Score evaluation
    if (m.zScore < 1.23) {
      recs.push("Critical Credit Alert: Altman Z'-Score falls within the Distress Zone. Institutional lenders will likely require collateralization or reject unsecured financing.");
    } else if (m.zScore > 2.9) {
      recs.push("Credit Standing Healthy: Balanced balance sheet and steady operational margins qualify the business for favorable commercial debt pricing.");
    }

    if (recs.length === 0) {
      recs.push("All financial indicators are currently within acceptable benchmark bounds. Maintain working capital controls.");
    }

    recs.forEach((item) => {
      const li = document.createElement("li");
      li.textContent = item;
      list.appendChild(li);
    });
  }

  function renderChart(cr, qr, npm, roa, de, icr) {
    const ctx = document.getElementById("benchmarkChart").getContext("2d");

    // Standardized scaled scores (100 = matches benchmark target)
    const smeScores = [
      Math.min((cr / 1.5) * 100, 160),
      Math.min((qr / 1.0) * 100, 160),
      Math.min((npm / 10) * 100, 160),
      Math.min((roa / 6) * 100, 160),
      Math.max(100 - (de - 1.5) * 50, 20), // Inverse: lower D/E is better
      Math.min((icr / 3.0) * 100, 160)
    ];

    const benchmarkScores = [100, 100, 100, 100, 100, 100];

    if (benchmarkChart) {
      benchmarkChart.destroy();
    }

    benchmarkChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: [
          "Current Ratio",
          "Quick Ratio",
          "Net Margin",
          "ROA",
          "Solvency (D/E)",
          "Interest Coverage"
        ],
        datasets: [
          {
            label: "SME Performance Index",
            data: smeScores,
            backgroundColor: "rgba(59, 130, 246, 0.7)",
            borderColor: "rgba(59, 130, 246, 1)",
            borderWidth: 1
          },
          {
            label: "Benchmark Standard (100)",
            data: benchmarkScores,
            type: "line",
            borderColor: "#f59e0b",
            borderDash: [5, 5],
            borderWidth: 2,
            fill: false,
            pointRadius: 3
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            max: 180,
            ticks: {
              color: "#94a3b8",
              callback: (v) => `${v}%`
            },
            grid: { color: "#334155" }
          },
          x: {
            ticks: { color: "#94a3b8" },
            grid: { display: false }
          }
        },
        plugins: {
          legend: {
            labels: { color: "#f8fafc" }
          }
        }
      }
    });
  }

  function resetOutputs() {
    document.getElementById("z-score-val").textContent = "--";
    const badge = document.getElementById("risk-badge");
    badge.className = "badge badge-neutral";
    badge.textContent = "Awaiting Data";

    const kpiElements = document.querySelectorAll(".kpi-value");
    kpiElements.forEach((el) => {
      el.textContent = "--";
    });

    document.getElementById("advisory-list").innerHTML =
      "<li>Complete the form or load sample data to generate strategic financial recommendations.</li>";

    if (benchmarkChart) {
      benchmarkChart.destroy();
      benchmarkChart = null;
    }
  }
});
