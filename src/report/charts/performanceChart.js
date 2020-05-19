/**
 © Copyright 2017 the World Health Organization (WHO).
 This software is distributed under the terms of the GNU General Public License version 3 (GPL Version 3),
 copied verbatim in the file “COPYING”.  In applying this license, WHO does not waive any of the privileges and
 immunities enjoyed by WHO under national or international law or submit to any national court jurisdiction.
 */

/**
 * Performance chart directive to be used in the report. It renders a scatter chart for coverage vs dropout rate.
 */
import Chart from "chart.js";
import i18next from "i18next";
import {addDownloadChartAsImageHandler} from "../../appCommons/chartHelper.js";

import colors from "../../colors.js";

angular.module("report").directive("performanceChart", function () {

    var chart = null;

    function createChart(opts) {

        if ( chart !== null ) {
            chart.destroy();
        }

        var data = opts.data;
        var showLegend = opts.showLegend;

        var chartJsConfig = {
            options: {
                chartArea: {
                    backgroundColor: "rgb(255,255,255)"
                },
                responsive: true,
                title: {
                    display: true,
                    text: data.title,
                    fontSize: 18,
                    fontColor: "#000000",
                    fontStyle: "normal",
                    fontFamily: "Lucida Grande, Lucida Sans Unicode, Arial, Helvetica, sans-serif"
                },
                legend: {
                    position: "bottom",
                    align: "center",
                    usePointStyle: false,
                    display: showLegend
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
                                i18next.t("Coverage") + ": " + point.x + "%", 
                                i18next.t("Dropout rate") + ": " + point.y + "%"
                            ];
                        }
                    },
                },
                annotation: {
                    drawTime: "beforeDatasetsDraw",
                    annotations: [
                        {
                            //dark green box
                            type: "box",
                            xScaleID: "x-axis-0",
                            yScaleID: "y-axis-0",
                            xMin: 90,
                            xMax: 100,
                            yMin: 0,
                            yMax: 10,
                            backgroundColor: colors.green_dark
                        },
                        {
                            //light green box
                            type: "box",
                            xScaleID: "x-axis-0",
                            yScaleID: "y-axis-0",
                            xMin: 90,
                            xMax: 100,
                            yMin: 10,
                            yMax: Math.max(100, data.yMax),
                            backgroundColor: colors.green_light
                        },
                        {

                            //yellow box
                            type: "box",
                            xScaleID: "x-axis-0",
                            yScaleID: "y-axis-0",
                            xMin: 0,
                            xMax: 90,
                            yMin: 0,
                            yMax: 10,
                            backgroundColor: colors.yellow
                        },
                        {
                            //red box
                            type: "box",
                            xScaleID: "x-axis-0",
                            yScaleID: "y-axis-0",
                            xMin: 0,
                            xMax: 90,
                            yMin: 10,
                            yMax: Math.max(100, data.yMax),
                            backgroundColor: colors.red 
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
                        data: data.datapoints
                    }
                ]
            }
        };
        var ctx = document.getElementById("performanceChart_chartjs").getContext("2d");
        chart = new Chart(ctx, chartJsConfig);
    }


    return {
        restrict: "E",
        scope: {
            "data": "=",
            "showLegend": "="
        },
        template: "<div style='position: relative;'><canvas height='100' id='performanceChart_chartjs'></canvas></div>",
        link: function (scope, element) {
            scope.$watch("data", function (newValue, oldValue) {

                //default showLegend to true
                var showLegend = typeof scope.showLegend === "undefined" ? true : scope.showLegend;

                console.log("data changed: " + newValue + " | " + oldValue);
                if (chart !== null) {
                    chart.destroy();
                }
                if (newValue !== oldValue) {
                    createChart({data: newValue, showLegend: showLegend});
                }
            });
            addDownloadChartAsImageHandler(element[0], "performanceChart");
        }
    };
});