/**
 © Copyright 2017 the World Health Organization (WHO).
 This software is distributed under the terms of the GNU General Public License version 3 (GPL Version 3),
 copied verbatim in the file “COPYING”.  In applying this license, WHO does not waive any of the privileges and
 immunities enjoyed by WHO under national or international law or submit to any national court jurisdiction.
 */

/**
 * Monitoring chart
 */
import Chart from "chart.js";

import {addDownloadChartAsImageHandler} from "../../appCommons/chartHelper.js";



angular.module("report").directive("monitoringChart", function () {

    var chart = null;

    function createChart(data) {

        if (chart !== null) {
            chart.destroy();
        }

        //use the same dataseries colors as highchart does.
        var colors = ["#7cb5ec", "#434348", "#90ed7d", "#f7a35c", "#8085e9", "#f15c80", "#e4d354", "#2b908f", "#f45b5b", "#91e8e1"];

        var datasets = data.series.map(function (item) {
            var color = item.color;
            if (!color) {
                var index = data.series.indexOf(item) - 1;
                color = colors[(index % (colors.length))]; //wrap around the color definitions if more than available of colors
                item.color = color;
            }

            var extendedObject = Object.assign(item, {
                fill: false,
                borderColor: item.color,
                backgroundColor: item.color,
                pointHoverRadius: 5
            });

            if ( extendedObject.isTargetSeries ) {
                extendedObject.borderDash = [5, 5];
                extendedObject.radius = 0;
                extendedObject.borderColor = "#FFA500";
                extendedObject.backgroundColor = "#FFA500";
                extendedObject.lineWidth = 4;
                extendedObject.marker = {
                    enabled: false
                };
            }

            return extendedObject;
        });

        var chartJsConfig = {

            type: "LineWithLine",	//see src/libs/chartjsLineWithLine extension
            scales: {
                xAxes: [{
                    id: "x-axis-0",
                    gridLines: {
                        display: false
                    },
                    scaleLabel: {
                        display: true,
                        labelString: data.xAxisLabel
                    }
                }],
                yAxes: [{
                    id: "y-axis-0",
                    scaleLabel: {
                        display: true,
                        labelString: data.yAxisLabel
                    }
                }]
            },
            options: {
                title: {
                    display: true,
                    text: data.title,
                    fontSize: 18,
                    fontColor: "#000000",
                    fontStyle: "normal",
                    fontFamily: "Lucida Grande, Lucida Sans Unicode, Arial, Helvetica, sans-serif"
                },
                chartArea: {
                    backgroundColor: "rgb(255,255,255)"
                },
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
                labels: data.categories,
                datasets: datasets
            }
        };

        var canvas = document.getElementById("monitoringChart_chartjs");
        var ctx = canvas.getContext("2d");
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        chart = new Chart(ctx, chartJsConfig);
    }

    return {
        restrict: "E",
        scope: {
            "data": "="
        },
        template: "<div style='position: relative;'><canvas height='80' id='monitoringChart_chartjs'></canvas></div>",
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

            addDownloadChartAsImageHandler(element[0], "monitoringChart");
        }
    };
});