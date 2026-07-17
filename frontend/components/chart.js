(function () {
  "use strict";

  window.SmartRisk = window.SmartRisk || {};

  window.SmartRisk.Chart = {
    line(data) {
      const width = 720;
      const height = 260;
      const padding = 34;
      const max = Math.max(...data.map(item => item.value), 100);
      const stepX = (width - padding * 2) / Math.max(data.length - 1, 1);

      const points = data.map((item, index) => {
        const x = padding + index * stepX;
        const y = height - padding - (item.value / max) * (height - padding * 2);
        return { ...item, x, y };
      });

      const line = points.map(point => `${point.x},${point.y}`).join(" ");
      const area = `${padding},${height - padding} ${line} ${width - padding},${height - padding}`;

      const grid = [0.25, 0.5, 0.75, 1].map(value => {
        const y = height - padding - value * (height - padding * 2);
        return `<line class="chart-grid-line" x1="${padding}" y1="${y}" x2="${width - padding}" y2="${y}"/>`;
      }).join("");

      return `
        <div class="chart-wrap">
          <svg class="chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Tendencia mensual">
            ${grid}
            <polygon class="chart-area" points="${area}"></polygon>
            <polyline class="chart-line" points="${line}"></polyline>
            ${points.map(point => `
              <circle class="chart-point" cx="${point.x}" cy="${point.y}" r="5"></circle>
              <text class="chart-label" x="${point.x}" y="${height - 8}" text-anchor="middle">${point.label}</text>
            `).join("")}
          </svg>
        </div>`;
    }
  };
})();
