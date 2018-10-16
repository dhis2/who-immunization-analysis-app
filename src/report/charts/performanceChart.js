/**
 * Performance chart directive to be used in the report. It renders a scatter chart for coverage vs dropout rate.
 */

// Define a plugin to provide data labels
/*Chart.plugins.register({
	afterDatasetsDraw: function(chart) {
		var ctx = chart.ctx;

		chart.data.datasets.forEach(function(dataset, i) {
			var meta = chart.getDatasetMeta(i);

			//debugger;
			if (!meta.hidden) {
				meta.data.forEach(function(element, index) {
					// Draw the text in black, with the specified font
					ctx.fillStyle = 'rgb(0, 0, 0)';

					var fontSize = 16;
					var fontStyle = 'normal';
					var fontFamily = 'Helvetica Neue';
					ctx.font = Chart.helpers.fontString(fontSize, fontStyle, fontFamily);

					// Just naively convert to string for now
					var dataString = dataset.data[index].name;

					// Make sure alignment settings are correct
					ctx.textAlign = 'center';
					ctx.textBaseline = 'middle';

					var padding = 5;
					var position = element.tooltipPosition();
					ctx.fillText(dataString, position.x, position.y - (fontSize / 2) - padding);
				});
			}
		});
	}
});
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
					enabled: true,
					mode: "nearest",
					intersect: false,
					caretPadding: 8,
					yAlign: "bottom",
					xAlign: "center",
					xPadding: 8,
					yPadding: 8,
					backgroundColor: "#ffffff",
					titleFontSize: 14,
					titleFontColor: "#000000",
					bodyFontColor: "#000000",
					displayColors: false,
					borderColor: "#000000",
					borderWidth: 1,
					bodyFontSize: 14,
					bodySpacing: 6,
					callbacks: {
						title: function(tooltipItem, data) {
							var title = data.labels[tooltipItem[0]["index"]];
							return title;
						},
						label: function(tooltipItem, data) {
							var point = data.datasets[0]["data"][tooltipItem["index"]];
							return [
								i18next.t('Coverage') + ": " + point.x + "%", 
								i18next.t('Dropout rate') + ": " + point.y + "%"
							];
						}
					},
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
							backgroundColor: "rgba(190,230,255, 0.5)"
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
								content: i18next.t("Coverage") + " = 90%",
								enabled: true,
								position: "top",
								backgroundColor: "rgba(0,0,0,0)",
								fontColor: "#000",
								xAdjust: 56
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
								content: i18next.t("Dropout rate") + " = 10%",
								enabled: true,
								position: "left",
								backgroundColor: "rgba(0,0,0,0)",
								fontColor: "#000",
								yAdjust: -14
							}
						}
					]
				}
			},
			type: "scatter",
			data: {
				labels: data.datapoints.map(function(item) { return item.name; }),
				datasets: [
					{
						label: i18next.t("Orgunits"),
						color: "#000000",
						pointStyle: "rect",
						pointBackgroundColor: "#000000",
						pointBorderWidth: 0,
						pointRadius: 5,
						/*pointHoverRadius: 6,
						pointHoverBorderWidth: 8,
						pointHoverBorderColor: "rgba(0,0,0,0.2)",
						pointHitRadius: 4,*/
						data: data.datapoints
					}
				]
			}
		};
		//var labels = data.datapoints.map(function(item) { return item.name; });
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