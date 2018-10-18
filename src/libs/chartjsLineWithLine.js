import Chart from "chart.js";


Chart.defaults.LineWithLine = Chart.defaults.line;
Chart.controllers.LineWithLine = Chart.controllers.line.extend({
	draw: function(ease) {
		Chart.controllers.line.prototype.draw.call(this, ease);

		if (this.chart.tooltip._active && this.chart.tooltip._active.length) {
			let activePoint = this.chart.tooltip._active[0];
			let ctx = this.chart.ctx;
			let x = activePoint.tooltipPosition().x;
			let topY = this.chart.scales["y-axis-0"].top;
			let bottomY = this.chart.scales["y-axis-0"].bottom;


			//draw line
			ctx.save();
			ctx.beginPath();
			ctx.moveTo(x, topY);
			ctx.lineTo(x, bottomY);
			ctx.lineWidth = 1;
			ctx.strokeStyle = "rgba(0,0,0,0.3)";
			ctx.stroke();
			ctx.restore();
		}
	}
});