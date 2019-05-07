/**
 © Copyright 2017 the World Health Organization (WHO).
 This software is distributed under the terms of the GNU General Public License version 3 (GPL Version 3),
 copied verbatim in the file “COPYING”.  In applying this license, WHO does not waive any of the privileges and
 immunities enjoyed by WHO under national or international law or submit to any national court jurisdiction.
 */

/**
 * Performance chart directive to be used in the report. It renders a stacked bar chart for summary by months
 */
import i18next from "i18next";
import {addDownloadChartAsImageHandler} from "../../appCommons/chartHelper.js";

angular.module("report").directive("performanceOrgunitSummary", function () {

	var chart = null;

	function createChart(chartData) {
        
		if ( chart !== null ) {
			chart.destroy();
		}

		var chartJsConfig = {
			type: "bar",
			options: {
				/*chartArea: {
					backgroundColor: "rgb(255,255,255)"
				},*/            
				responsive: true,
				title: {
					display: true,
					text: chartData.title,
					fontSize: 18,
					fontColor: "#000000",
					fontStyle: "normal",
					fontFamily: "Lucida Grande, Lucida Sans Unicode, Arial, Helvetica, sans-serif"
				},
				legend: {
					position: "bottom",
					align: "center",
					usePointStyle: false,
					reverse: true,
					fontStyle: "bold"
				},
				tooltips: {
					mode: "index",
					intersect: false,
					caretPadding: 8,
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
					itemSort: function() {
						return 1;	//reverse Category D,C,B,A to become A,B,C,D
					},
					callbacks: {
						label: function(tooltipItem, data) {
							var label = data.datasets[tooltipItem.datasetIndex].label;
							var value = data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index];

							//stacked100 plugin creates the calculatedData
							var percentage = Math.round(data.calculatedData[tooltipItem.datasetIndex][tooltipItem.index]);

							return label + ": " + value + " ("+ percentage +"%)";
						}
					}
				},
				scales: {
					xAxes: [{
						id: "x-axis-0",
						gridLines: {
							display: false
						}
					}],
					yAxes: [{
						id: "y-axis-0",
						scaleLabel: {
							display: true,
							labelString: i18next.t("Orgunits") + " (%)"
						},
						ticks: {
							stepSize: 25,
							beginAtZero: true
						}
					}]
				},
				plugins: {
					stacked100: { 
						enable: true,
						replaceTooltipLabel: false
					}
				}
			},
			data: {
				labels: chartData.categories,
				datasets: chartData.series.reverse()
			}
		};

		var ctx = document.getElementById("performanceOrgunitSummaryChartData_chartjs").getContext("2d");
		chart = new Chart(ctx, chartJsConfig);
	}

	return {
		restrict: "E",
		scope: {
			"data": "="
		},
		template: "<div style='position: relative;'><canvas height='100' id='performanceOrgunitSummaryChartData_chartjs'></canvas></div>",
		link: function (scope, element) {
			scope.$watch("data", function (newValue, oldValue) {
				console.log("data changed: " + newValue + " | " + oldValue);
				if (chart !== null) {
					chart.destroy();
				}
				if (newValue !== oldValue) {
					createChart(newValue);
				}
			});
			addDownloadChartAsImageHandler(element[0], "performanceOrgunitSummaryChart");
		}
	};
});