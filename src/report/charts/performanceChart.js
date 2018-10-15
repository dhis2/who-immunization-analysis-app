/**
 * Performance chart directive to be used in the report. It renders a scatter chart for coverage vs dropout rate.
 */

angular.module("report").directive("performanceChart", function () {

	let chart = null;

	function createChart(data) {

		if ( chart !== null ) {
			chart.destroy();
		}

		var chartJsConfig = {
			options: {
				responsive: true,
				title: {
					display: true,
					text: data.title
				},
				scales: {
					xAxes: [{
						id: "x-axis-0",
						display: true,
						gridLines: {
							display: false
						},
						scaleLabel: {
							display: true,
							labelString: i18next.t("DPT 1 coverage") + " (%)"
						},
						ticks: {
							min: 0,
							max: data.xMax,
							stepSize: 5
						}
					}],
					yAxes: [{
						id: "y-axis-0",
						scaleLabel: {
							display: true,
							labelString: i18next.t("DPT 1 to 3 dropout rate") + " (%)"
						},
						ticks: {
							min: data.yMin,
							max: data.yMax,
							stepSize: 10,
							beginAtZero: true
						}
					}]
				},
				tooltips: {
					enabled: false,
					mode: "nearest",
					intersect: false,
					custom: function (tooltip) {
						var tooltipEl = document.getElementById("chartjs-tooltip");

						if (!tooltipEl) {
							tooltipEl = document.createElement("div");
							tooltipEl.id = "chartjs-tooltip";
							tooltipEl.innerHTML = "<table></table>";
							this._chart.canvas.parentNode.appendChild(tooltipEl);
						}

						// Hide if no tooltip
						if (tooltip.opacity === 0) {
							tooltipEl.style.opacity = 0;
							return;
						}

						// Set caret Position
						tooltipEl.classList.remove("above", "below", "no-transform");
						if (tooltip.yAlign) {
							tooltipEl.classList.add(tooltip.yAlign);
						} else {
							tooltipEl.classList.add("no-transform");
						}

						function getBody(bodyItem) {
							return bodyItem.lines;
						}

						// Set Text
						if (tooltip.body) {
							//debugger;

							var titleLines = tooltip.title || [];
							var bodyLines = tooltip.body.map(getBody);

							var innerHtml = "<thead>";

							titleLines.forEach(function (title) {
								innerHtml += "<tr><th>" + title + "</th></tr>";
							});
							innerHtml += "</thead><tbody>";

							bodyLines.forEach(function (body, i) {
								var colors = tooltip.labelColors[i];
								var style = "background:" + colors.backgroundColor;
								style += "; border-color:" + colors.borderColor;
								style += "; border-width: 2px";
								var span = "<span class=\"chartjs-tooltip-key\" style=\"" + style + "\"></span>";
								innerHtml += "<tr><td>" + span + body + "</td></tr>";
							});
							innerHtml += "</tbody>";

							var tableRoot = tooltipEl.querySelector("table");
							tableRoot.innerHTML = innerHtml;
						}

						var positionY = this._chart.canvas.offsetTop;
						var positionX = this._chart.canvas.offsetLeft;

						// Display, position, and set styles for font
						tooltipEl.style.opacity = 1;
						tooltipEl.style.left = positionX + tooltip.caretX + "px";
						tooltipEl.style.top = positionY + tooltip.caretY + "px";
						tooltipEl.style.fontFamily = tooltip._bodyFontFamily;
						tooltipEl.style.fontSize = tooltip.bodyFontSize + "px";
						tooltipEl.style.fontStyle = tooltip._bodyFontStyle;
						tooltipEl.style.padding = tooltip.yPadding + "px " + tooltip.xPadding + "px";
						tooltipEl.style.zIndex = 5000;
					}
				},
				annotation: {
					drawTime: "beforeDatasetsDraw",
					annotations: [
						{
							type: "box",
							xScaleID: "x-axis-0",
							yScaleID: "y-axis-0",
							xMin: 90,
							xMax: 100,
							yMin: 0,
							yMax: 10,
							backgroundColor: "rgba(35,255,35,0.2)"
						},
						{
							type: "box",
							xScaleID: "x-axis-0",
							yScaleID: "y-axis-0",
							xMin: 90,
							xMax: 100,
							yMin: 10,
							yMax: 30,
							backgroundColor: "#D9EDF7aa"
						},
						{
							type: "box",
							xScaleID: "x-axis-0",
							yScaleID: "y-axis-0",
							xMin: 0,
							xMax: 90,
							yMin: 0,
							yMax: 10,
							backgroundColor: "rgba(255,255,80,0.2)"
						},
						{
							type: "box",
							xScaleID: "x-axis-0",
							yScaleID: "y-axis-0",
							xMin: 0,
							xMax: 90,
							yMin: 10,
							yMax: 30,
							backgroundColor: "rgba(255,35,35,0.2)"
						},
						{
							type: "line",
							drawTime: "afterDatasetsDraw",
							scaleID: "x-axis-0",
							mode: "vertical",
							value: 90,
							borderColor: "#000",
							borderWidth: 1,
							label: {
								content: i18next.t("Coverage") + " = 90%"
							}
						},
						{
							type: "line",
							drawTime: "afterDatasetsDraw",
							scaleID: "y-axis-0",
							mode: "horizontal",
							value: 10,
							borderColor: "#000",
							borderWidth: 1,
							label: {
								content: i18next.t("Dropout rate") + " = 10%"
							}
						}
					]
				}
			},
			type: "scatter",
			data: {
				labels: [],
				datasets: [
					{
						label: i18next.t("Orgunits"),
						color: "#000000",
						pointStyle: "rect",
						pointBackgroundColor: "#000000",
						pointBorderWidth: 2,
						pointBorderColor: "#000000",
						pointHoverRadius: 6,
						pointHoverBorderWidth: 6,
						pointHitRadius: 12,
						data: data.datapoints,
						marker: {
							radius: 3
						}
					}
				]
			}
		};

		let ctx = document.getElementById("performanceChart_chartjs").getContext("2d");
		chart = new Chart(ctx, chartJsConfig);
	}


	return {
		restrict: "E",
		scope: {
			"performanceChartData": "="
		},
		template: "<div style='margin-bottom: 20px'><canvas id='performanceChart_chartjs'></canvas></div>",
		link: function (scope, element, attrs) {
			scope.$watch("performanceChartData", function (newValue, oldValue) {
				console.log("performanceChartData changed: " + newValue + " | " + oldValue);
				if (chart !== null) {
					chart.destroy();
				}
				if (newValue !== oldValue) {
					createChart(newValue);
				}
			});
		}
	};
});