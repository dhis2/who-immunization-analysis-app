/**
 * Performance chart directive to be used in the report. It renders a stacked bar chart for summary by months
 */
angular.module("report").directive("performanceChartTimeSummary", function () {

	let chart = null;

	function createChart(chartData) {
        
        //debugger;
		if ( chart !== null ) {
			chart.destroy();
		}

		var chartJsConfig = {
            type: "bar",
			options: {                
				responsive: true,
				title: {
					display: true,
					text: i18next.t('Summary by month'),
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
					itemSort: function(a,b) {
						return 1;	//reverse Category D,C,B,A to become A,B,C,D
					},
                    callbacks: {
                        label: function(tooltipItem, data) {
							let label = data.datasets[tooltipItem.datasetIndex].label;
							let value = data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index];

							//stacked100 plugin creates the calculatedData
							let percentage = Math.round(data.calculatedData[tooltipItem.datasetIndex][tooltipItem.index]);

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
							labelString: i18next.t('Orgunits') + " (%)"
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
                labels: chartData.months,
                datasets: chartData.series.reverse()
            }
        };

        let ctx = document.getElementById("performanceChartTimeSummaryData_chartjs").getContext("2d");
		chart = new Chart(ctx, chartJsConfig);
    }

	return {
		restrict: "E",
		scope: {
			"performanceChartTimeSummaryData": "="
		},
		template: "<div style='position: relative;'><canvas height='100' id='performanceChartTimeSummaryData_chartjs'></canvas></div>",
		link: function (scope, element, attrs) {
			scope.$watch("performanceChartTimeSummaryData", function (newValue, oldValue) {
				console.log("performanceChartTimeSummaryData changed: " + newValue + " | " + oldValue);
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