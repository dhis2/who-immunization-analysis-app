


Chart.defaults.LineWithLine = Chart.defaults.line;
Chart.controllers.LineWithLine = Chart.controllers.line.extend({
	draw: function(ease) {
		Chart.controllers.line.prototype.draw.call(this, ease);

		if (this.chart.tooltip._active && this.chart.tooltip._active.length) {
			var activePoint = this.chart.tooltip._active[0];
			var ctx = this.chart.ctx;
			var x = activePoint.tooltipPosition().x;
			var topY = this.chart.scales["y-axis-0"].top;
			var bottomY = this.chart.scales["y-axis-0"].bottom;


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