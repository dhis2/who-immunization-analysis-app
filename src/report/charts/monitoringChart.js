
/**
 * Monitoring chart
 */
import Chart from "chart.js";


angular.module("report").directive("monitoringChart", function () {

	let chart = null;

	function createChart(data) {

		if (chart !== null) {
			chart.destroy();
		}

		//use the same colors as highchart does.
		let colors = ["#7cb5ec", "#434348", "#90ed7d", "#f7a35c", "#8085e9", "#f15c80", "#e4d354", "#2b908f", "#f45b5b", "#91e8e1"];

		let datasets = data.series.map(function (item) {
			var color = item.color;
			if (!color) {
				var index = data.series.indexOf(item) - 1;
				color = colors[(index % (colors.length))]; //wrap around the color definitions if more than 10
				item.color = color;
			}

			return Object.assign(item, {
				label: item.name,
				fill: false,
				borderColor: item.color,
				backgroundColor: item.color,
				pointHoverRadius: 5
			});
		});

		let chartJsConfig = {
			type: "LineWithLine",
			title: {
				display: false,
				text: data.title,
				fontSize: 18,
				fontColor: "#000000",
				fontStyle: "normal",
				fontFamily: "Lucida Grande, Lucida Sans Unicode, Arial, Helvetica, sans-serif"
			},
			options: {
				responsive: true,
				legend: {
					position: "right",
					align: "center",
					usePointStyle: true
				},
				tooltips: {
					mode: "index",
					intersect: false
				}
			},
			data: {
				labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
				datasets: datasets
			}
		};

		let ctx = document.getElementById("monitoringChart_chartjs").getContext("2d");
		chart = new Chart(ctx, chartJsConfig);
	}

	return {
		restrict: "E",
		scope: {
			"monitoringChartData": "="
		},
		template: "<div style='position: relative;'><canvas height='80' id='monitoringChart_chartjs'></canvas></div>",
		link: function (scope) {
			scope.$watch("monitoringChartData", function (newValue, oldValue) {
				console.log("monitoringChartData changed: " + newValue + " | " + oldValue);
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