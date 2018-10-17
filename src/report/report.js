//Define module
const report = angular.module("report", []);

//Define DashboardController
report.controller("ReportController",
	["d2Map", "d2Meta", "d2Data", "d2Utils", "$q",
		function(d2Map, d2Meta, d2Data, d2Utils, $q) {

			var self = this;
			self.monitorChart = null;
			self.performanceChartData = null;
			self.performanceChartTimeSummaryData = null;

			self.makeReport = function() {
				self.current = {
					"type": self.selectedReport.id,
					"ouFilter": ((self.selectedReport.id === "vac" && self.selectedVaccineReport.id === "allVac") ||
						self.selectedReport.id === "mon"),
					"year": self.selectedPeriod.id
				};
		
				//Remove old charts
				//Highcharts.charts = [];

				switch (self.selectedReport.id) {
				case "vac":
					vaccineReport();
					break;
				case "perf":
					performanceReport();
					break;
				case "mon":
					monitoringReport();
					break;
				case "rim":
					rimExport();
					break;
				default:
					console.log("Not implemented");
				}

			};

			self.isReady = function() {
				if (!self.selectedReport) return false;
		
				if (!self.selectedOrgunit.hasOwnProperty("boundary")) return false;

				var dataSelection;
				if (self.selectedVaccines) {
					dataSelection = d2Utils.toArray(self.selectedVaccines);
					if ((self.selectedReport.id === "vac" || self.selectedReport.id === "mon") && dataSelection.length === 0) return false;
				}
				else {
					if (self.selectedReport.id === "vac" || self.selectedReport.id === "mon") return false;
				}

				if (self.selectedPeriod === undefined) return false;

				if (self.selectedReport.id === "vac" && self.selectedVaccineReport.id === "oneVac") {
					if (self.selectedOrgunit.level === undefined) return false;
				}
				if (self.selectedReport.id === "mon" && self.selectedMonitoringReport.id === "allVac") {
					if (self.selectedTarget === undefined) return false;
				}
				if (self.selectedReport.id === "rim") {
					if (self.selectedOrgunit.level === undefined) return false;
					if (self.selectedMonth === undefined) return false;
				}

				return true;
			};


			/** VACCINE REPORT **/
			function vaccineReport() {
				console.log("Making vaccine report");

				//Save misc parameters for report we are making
				self.current.cumulative = self.aggregationType === "cumulative";
				self.current.hieararchy = (self.selectedOrgunit.boundary.level > 2 || (self.selectedOrgunit.level && self.selectedOrgunit.level.level > 2)) && !self.current.ouFilter;


				//Data
				self.current.indicators = d2Utils.toArray(self.selectedVaccines);
				self.current.dataIds = vaccineReportDataIds().all;
				self.current.denominatorIds = vaccineReportDataIds().denominators;

				//Period
				self.current.periods = monthsInYear(self.selectedPeriod.id);

				//Orgunit
				self.current.orgunits = self.selectedOrgunit;

				var pe = self.current.periods;
				var dx = self.current.dataIds;

				//see if orgunit level should be used
				var level = self.current.ouFilter ? null :
					self.selectedOrgunit.level ? self.selectedOrgunit.level.level : null;


				//fetch metadata and data
				//Need to check whether denominator is annualized, or if we should annualize it
				var promises = [];
				promises.push(d2Meta.objects("indicators", self.current.denominatorIds, "id,annualized", "annualized:eq:true", false));

				//data
				d2Data.addRequest(dx, pe, self.selectedOrgunit.boundary.id, level, null);
				promises.push(d2Data.fetch());

				$q.all(promises).then(function(datas) {
					self.current.annualizedDenominators = datas[0];
					self.current.d2meta = datas[1];
					vaccineReportProcessData();
				});
			}


			function vaccineReportProcessData() {
				//Iterate over periods / orgunits / data
				self.current.data = [];

				var indicators = self.current.indicators;
				var periods = self.current.d2meta.pe;
				var orgunits = self.current.d2meta.ou;
				var hieararchy = self.current.d2meta.ouHierarchy;
				var cumulative = self.current.cumulative;

				var orgunit, indicator, values, row;
				for (var i = 0; i < orgunits.length; i++) {
					orgunit = orgunits[i];

					for (var j = 0; j < indicators.length; j++) {
						indicator = indicators[j];
						values = vaccineReportValue(indicator, periods, orgunit);

						row = {
							"vaccine": indicator.displayName,
							"vaccineCode": indicator.code,
							"ou": d2Data.name(orgunit),
							"ouId": orgunit
						};

						if (self.current.hieararchy) {
							var parentIds = hieararchy[orgunit].split("/").splice(1);
							var parentNames = [];
							for (var k = 0; k < parentIds.length; k++) {
								parentNames.push(d2Data.name(parentIds[k]));
							}

							row.parentIds = parentIds.join("/");
							row.parents = parentNames.join(" - ");
						}

						for (var k = 0; k < periods.length; k++) {
							row[periods[k]] = values[k];
						}

						self.current.data.push(row);

					}
				}

				var headerColumns = [];

				//Add column headers
				headerColumns.push({ id: "ou", title: i18next.t('Organisation unit') });
				headerColumns.push({ id: "vaccine", title: i18next.t('Vaccine') });
				if (self.current.hieararchy) {
					d2Utils.arraySortByProperty(self.current.data, "parents", false, false);
					headerColumns.unshift({ id: "parents", title: i18next.t('Hierarchy') });
				}
				if (self.current.ouFilter) {
					//Sort data
					d2Utils.arraySortByProperty(self.current.data, "vaccine", false, false);

					//Set title
					self.current.title = d2Data.name(orgunit);
					self.current.subtitle = periods[0].substr(0,4);
				}
				else {
					//Sort data
					d2Utils.arraySortByProperty(self.current.data, "ou", false, false);

					//Add title
					self.current.title = self.current.indicators[0].displayName;
					self.current.subtitle = periods[0].substr(0,4);
				}


				var dataColumns = [];
				for (var i = 0; i < periods.length; i++) {
					dataColumns.push({
						id: periods[i], title: d2Data.name(periods[i]).split(" ")[0]
					});
				}

				self.current.headerColumns = headerColumns;
				self.current.dataColumns = dataColumns;
				self.current.dataTable = angular.copy(self.current.data);

				self.hideLeftMenu();
			}


			function vaccineReportValue(indicator, periods, orgunit) {
				var cumulated = {
					"vaccineTarget": 0,
					"vaccineAll": 0,
					"denominator": 0
				};
				var current = {
					"vaccineTarget": null,
					"vaccineAll": null,
					"denominator": null
				};

				var vaccineTargetId = indicator["vaccineTarget"];
				var vaccineAllId = indicator["vaccineAll"];
				var denominatorId = indicator["denominator"];


				var target, all, denominator;
				var dataSeries = [];
				for (var i = 0; i < periods.length; i++) {

					//Get numerator for current month
					target = d2Data.value(vaccineTargetId, periods[i], orgunit, null, null);
					all = d2Data.value(vaccineAllId, periods[i], orgunit, null, null);
					denominator = d2Data.value(denominatorId, periods[i], orgunit, null, null);

					//If population is set up as indicator it could already be annualized, so we need to check
					if (!annualized(denominatorId)) denominator = denominator/12;

					if (self.current.cumulative) {
						cumulated.vaccineTarget += !target ? 0 : target;
						cumulated.vaccineAll += !all ? 0 : all;
						cumulated.denominator += !denominator ? 0 : denominator;

						current.vaccineTarget = cumulated.vaccineTarget;
						current.vaccineAll = cumulated.vaccineAll;
						current.denominator = cumulated.denominator;

					}
					else {
						current.vaccineTarget = target;
						current.vaccineAll = all;
						current.denominator = denominator;
					}

					var coverage = current.denominator ? d2Utils.round(100*current.vaccineTarget/current.denominator, 1) : null;

					var result = {
						"vaccineTarget": current.vaccineTarget,
						"vaccineAll": current.vaccineAll,
						"denominator": current.denominator,
						"coverage": coverage
					};

					dataSeries.push(result);
				}

				return dataSeries;
			}


			function vaccineReportDataIds() {

				var all = [];
				var denominators = [];
				var indicators = d2Utils.toArray(self.selectedVaccines);
				for (var i = 0; i < indicators.length; i++) {
					denominators.push(indicators[i]["denominator"]);
					all.push(indicators[i]["vaccineTarget"], indicators[i]["vaccineAll"], indicators[i]["denominator"]);
				}

				return {"all": all, "denominators": denominators};
			}


			self.vaccineReportDownload = function() {
				var table = [];
				var periods = [];


				var headerRow = [];
				for (var i = 0; i < self.current.headerColumns.length; i++) {
					headerRow.push(self.current.headerColumns[i].title);
				}
				headerRow.push(i18next.t('Data'));
				for (var i = 0; i < self.current.dataColumns.length; i++) {
					headerRow.push(self.current.dataColumns[i].title);
					periods.push(self.current.dataColumns[i].id);
				}
				table.push(headerRow);

				var dataFields = [{"id": "vaccineAll", "name": i18next.t('all ages')}, {"id": "vaccineTarget", "name": i18next.t('target age')},
					{"id": "coverage", "name": i18next.t('coverage')}];
				for (var i = 0; i < self.current.dataTable.length; i++) {

					for (j = 0; j < dataFields.length; j++) {
						var dataField = dataFields[j];
						var row = [];

						if (self.current.dataTable[i].parents) row.push(self.current.dataTable[i].parents);
						row.push(self.current.dataTable[i].ou, self.current.dataTable[i].vaccine, dataField.name);

						//Row for all ages
						for (var k = 0; k < periods.length; k++) {
							row.push(self.current.dataTable[i][periods[k]][dataField.id]);
						}

						table.push(row);
					}
				}

				makeExportFile(table, "vaccinations");
			};



			/** PERFORMANCE REPORT **/
			function performanceReportPossible() {
				var perf = d2Map.performance("P1");
				if (d2Map.indicatorsConfigured(perf.indicator) && d2Map.dropoutsConfigured(perf.dropout)) return true;
				return false;
			}


			function performanceReport() {
				console.log("Making performance report");

				//TODO: add a better error message that DPT1-2-3 has to be configured instead.
				if (!performanceReportPossible()) alert(i18next.t('Performance report has not been configured, contact the administrators.'));

				//Save misc parameters for report we are making
				self.current.cumulative = self.aggregationType === "cumulative";
				self.current.hieararchy = self.selectedOrgunit.boundary.level > 2 ||
			(self.selectedOrgunit.level && self.selectedOrgunit.level.level > 2);

				//Data
				var perf = d2Map.performance("P1");
				self.current.performance = perf;
				self.current.indicator = d2Map.indicators(perf.indicator);
				self.current.dropout = d2Map.dropouts(perf.dropout);

				self.current.dataIds = performanceReportDataIds().all;
				self.current.denominatorIds = performanceReportDataIds().denominators;

				//Period
				self.current.periods = monthsInYear(self.selectedPeriod.id);

				//Orgunit
				self.current.orgunits = self.selectedOrgunit;

				var pe = self.current.periods;
				var dx = self.current.dataIds;

				//see if orgunit level should be used
				var level = self.current.ouFilter ? null :
					self.selectedOrgunit.level ? self.selectedOrgunit.level.level : null;

				//fetch metadata and data
				//Need to check whether denominator is annualized, or if we should annualize it
				var promises = [];
				promises.push(d2Meta.objects("indicators", self.current.denominatorIds, "id,annualized", "annualized:eq:true", false));

				//data
				d2Data.addRequest(dx, pe, self.selectedOrgunit.boundary.id, level, null);
				promises.push(d2Data.fetch());

				$q.all(promises).then(function(datas) {

					self.current.annualizedDenominators = datas[0];

					self.current.d2meta = datas[1];
					performanceReportProcessData();
				});
			}


			function performanceReportProcessData() {
				//Iterate over periods / orgunits / data
				self.current.data = [];

				var periods = self.current.d2meta.pe;
				var orgunits = self.current.d2meta.ou;
				var hieararchy = self.current.d2meta.ouHierarchy;
				var cumulative = self.current.cumulative;

				var orgunit, indicator, values, row;
				for (var i = 0; i < orgunits.length; i++) {
					orgunit = orgunits[i];

					values = performanceReportValue(periods, orgunit);

					row = {
						"vaccine": "vac",
						"vaccineCode": "vacCode",
						"ou": d2Data.name(orgunit),
						"ouId": orgunit
					};

					if (self.current.hieararchy) {
						var parentIds = hieararchy[orgunit].split("/").splice(1);
						var parentNames = [];
						for (var k = 0; k < parentIds.length; k++) {
							parentNames.push(d2Data.name(parentIds[k]));
						}

						row.parentIds = parentIds.join("/");
						row.parents = parentNames.join(" - ");
					}

					for (var k = 0; k < periods.length; k++) {
						row[periods[k]] = values[k];
					}

					self.current.data.push(row);

				}

				var columns = [];
				var columnsData = [];

				//Add column headers
				columns.push({ id: "ou", title: i18next.t('Organisation unit') });
				d2Utils.arraySortByProperty(self.current.data, "ou", false, false);
				if (self.current.hieararchy) {
					d2Utils.arraySortByProperty(self.current.data, "parents", false, false);
					columns.unshift({ id: "parents", title: i18next.t('Hierarchy') });
					d2Utils.arraySortByProperty(self.current.data, "parents", false, false);
				}


				//Add title
				self.current.title = self.current.performance.displayName;
				self.current.subtitle = periods[0].substr(0,4);


				for (var i = 0; i < periods.length; i++) {
					columnsData.push({
						id: periods[i], title: d2Data.name(periods[i]).split(" ")[0]
					});
				}

				self.current.dataHeader = columns;
				self.current.dataHeaderData = columnsData;

				performanceSetCategory();
				performanceChart();
				performanceTimeSummaryChart();
				performanceOrgunitSummaryChart();

				self.current.dataTable = angular.copy(self.current.data);

				self.hideLeftMenu();
			}


			function performanceReportValue(periods, orgunit) {

				var covNumId = self.current.indicator.vaccineTarget;
				var covDenId = self.current.indicator.denominator;
				var dropFromId = d2Map.indicators(self.current.dropout.vaccineFrom).vaccineTarget;
				var dropToId = d2Map.indicators(self.current.dropout.vaccineTo).vaccineTarget;

				var cumulated = {
					"covNum": 0,
					"covDen": 0,
					"dropFrom": 0,
					"dropTo": 0
				};

				var covNum, covDen, dropFrom, dropTo, currentCovNum, currentCovDen, currentDropFrom, currentDropTo;
				var dataSeries = [];
				for (var i = 0; i < periods.length; i++) {

					//Get data for current month
					covNum = d2Data.value(covNumId, periods[i], orgunit, null, null);
					covDen = d2Data.value(covDenId, periods[i], orgunit, null, null);
					dropFrom = d2Data.value(dropFromId, periods[i], orgunit, null, null);
					dropTo = d2Data.value(dropToId, periods[i], orgunit, null, null);

					if (!annualized(covDenId))covDen = covDen/12;


					if (self.current.cumulative) {
						cumulated.covNum += !covNum ? 0 : covNum;
						cumulated.covDen += !covDen ? 0 : covDen;
						cumulated.dropFrom += !dropFrom ? 0 : dropFrom;
						cumulated.dropTo += !dropTo ? 0 : dropTo;

						currentCovNum = cumulated.covNum;
						currentCovDen = cumulated.covDen;
						currentDropFrom = cumulated.dropFrom;
						currentDropTo = cumulated.dropTo;
					}
					else {
						currentCovNum = covNum;
						currentCovDen = covDen;
						currentDropFrom = dropFrom;
						currentDropTo = dropTo;
					}

					var coverage, dropout;
					if (!currentCovNum || !currentCovDen) coverage = null;
					else coverage = d2Utils.round(100*currentCovNum/currentCovDen, 1);
					if (!currentDropFrom || !currentDropTo) dropout = null;
					else dropout = d2Utils.round(100*(currentDropFrom-currentDropTo)/currentDropFrom, 1);

					dataSeries.push({"coverage": coverage, "dropout": dropout, "category": null});

				}

				return dataSeries;
			}


			function performanceSetCategory() {
				var coverageLimit = 90;
				var dropoutLimit = 10;

				for (var i = 0; i < self.current.data.length; i++) {
					for (var j = 0; j < self.current.periods.length; j++) {
						var value = self.current.data[i][self.current.periods[j]];

						if (!value.coverage || !value.dropout) {
							self.current.data[i][self.current.periods[j]].category = false;
						}
						else if (value.coverage >= coverageLimit && value.dropout <= dropoutLimit) {
							self.current.data[i][self.current.periods[j]].category = "A";
						}
						else if (value.coverage >= coverageLimit && value.dropout > dropoutLimit) {
							self.current.data[i][self.current.periods[j]].category = "B";
						}
						else if (value.coverage < coverageLimit && value.dropout <= dropoutLimit) {
							self.current.data[i][self.current.periods[j]].category = "C";
						}
						else if (value.coverage < coverageLimit && value.dropout > dropoutLimit) {
							self.current.data[i][self.current.periods[j]].category = "D";
						}
						else {
							self.current.data[i][self.current.periods[j]].category = false;
						}
					}
				}
			}


			function performanceReportDataIds() {

				var all = [];
				var denominators = [];
				all.push(self.current.indicator.vaccineTarget);
				all.push(self.current.indicator.denominator);
				denominators.push(self.current.indicator.denominator);

				all.push(d2Map.indicators(self.current.dropout.vaccineFrom).vaccineTarget);
				all.push(d2Map.indicators(self.current.dropout.vaccineTo).vaccineTarget);

				return {"all": all, "denominators": denominators};
			}


			function performanceChart() {

				var xMax = 100, yMax = 30, yMin = 0;
				var datapoints = [];

				//Find the latest period with data, which we use for the chart
				var period = performanceChartPeriod();

				for (var i = 0; i < self.current.data.length; i++) {
					var value = self.current.data[i][period];

					if (value.coverage && value.dropout) {
						datapoints.push({
							"x": value.coverage,
							"y": value.dropout,
							"name": self.current.data[i].ou
						});
					}

					xMax = value.coverage > xMax ? value.coverage : xMax;
					yMax = value.dropout > yMax ? value.dropout : yMax;
					yMin = value.dropout < yMin ? value.dropout : yMin;

				}

				yMax = Math.ceil(yMax/10)*10;
				yMin = Math.floor(yMin/10)*10;
				xMax = Math.ceil(xMax/10)*10;

				if (yMax > 30) yMax = 50;
				if (yMin < -50) yMin = -50;
				if (xMax > 200) xMax = 200;

				self.performanceChartData = {
					title: d2Data.name(period),
					xMin: 0,
					xMax: xMax,
					yMin: yMin,
					yMax: yMax,
					datapoints: datapoints
				};

			}


			function performanceTimeSummaryChart() {

				var seriesA = [], seriesB = [],
					seriesC = [], seriesD = [];

				var j;
				for (var j = 0; j < self.current.periods.length; j++) {
					for (var i = 0; i < self.current.data.length; i++) {
						var value = self.current.data[i][self.current.periods[j]];

						if (i === 0) {
							seriesA.push(0);
							seriesB.push(0);
							seriesC.push(0);
							seriesD.push(0);
						}

						if (value.category === "A") seriesA[j]++;
						if (value.category === "B") seriesB[j]++;
						if (value.category === "C") seriesC[j]++;
						if (value.category === "D") seriesD[j]++;

					}
					if (self.current.periods[j] === performanceChartPeriod()) break;
				}

				var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].slice(0, ++j);

				console.log(seriesA);
				console.log(seriesB);
				console.log(seriesC);
				console.log(seriesD);

				self.performanceChartTimeSummaryData = {
					months: months,
					series: [{
						label: i18next.t('Category A'),
						data: seriesA,
						backgroundColor: "#dff0d8"
					}, {
						label: i18next.t('Category B'),
						data: seriesB,
						backgroundColor: "#d9edf7"
					}, {
						label: i18next.t('Category C'),
						data: seriesC,
						backgroundColor: "#fcf8e3"
					}, {
						label: i18next.t('Category D'),
						data: seriesD,
						backgroundColor: "#f2dede"
					}]
				};
			}


			function performanceOrgunitSummaryChart() {
				performanceChartPeriod();
				var parentIdIndex;

				//1: is this relevant, e.g. is there a level between boundary and selected level
				if ((self.current.orgunits.level.level - self.current.orgunits.boundary.level) < 2) {
					console.log("No orgunit summary");
					return;
				}
				else {
					//Find what level we are showing - should be one below boundary
					parentIdIndex = self.current.orgunits.boundary.level-1;
				}

				var hierarhcySummary = {};
				var period = performanceChartPeriod();
				for (var i = 0; i < self.current.data.length; i++) {
					var value = self.current.data[i][period];
					var topParent = self.current.data[i]["parentIds"].split("/")[parentIdIndex];
					if (!hierarhcySummary.hasOwnProperty(topParent)) {
						hierarhcySummary[topParent] = {
							"A": 0,
							"B": 0,
							"C": 0,
							"D": 0
						};
					}

					if (value.category === "A") hierarhcySummary[topParent]["A"]++;
					if (value.category === "B") hierarhcySummary[topParent]["B"]++;
					if (value.category === "C") hierarhcySummary[topParent]["C"]++;
					if (value.category === "D") hierarhcySummary[topParent]["D"]++;
				}


				var seriesA = [];
				var seriesB = [];
				var seriesC = [];
				var seriesD = [];
				var parents = [];
				for (ouId in hierarhcySummary) {
					parents.push(d2Data.name(ouId));
					seriesA.push(hierarhcySummary[ouId]["A"]);
					seriesB.push(hierarhcySummary[ouId]["B"]);
					seriesC.push(hierarhcySummary[ouId]["C"]);
					seriesD.push(hierarhcySummary[ouId]["D"]);
				}

				Highcharts.chart("performanceChartDataSummary", {
					chart: {
						type: "column"
					},
					title: {
						text: i18next.t('Summary by orgunit') + ' - ' + d2Data.name(period)
					},
					xAxis: {
						categories: parents
					},
					yAxis: {
						min: 0,
						title: {
							text: "Orgunits (%)"
						}
					},
					tooltip: {
						pointFormat: "<span>{series.name}</span>: <b>{point.y}</b> ({point.percentage:.0f}%)<br/>",
						shared: true
					},
					plotOptions: {
						column: {
							stacking: "percent"
						}
					},
					series: [{
						name: i18next.t('Category A'),
						data: seriesA,
						color: "#dff0d8"
					}, {
						name: i18next.t('Category B'),
						data: seriesB,
						color: "#d9edf7"
					}, {
						name: i18next.t('Category C'),
						data: seriesC,
						color: "#fcf8e3"
					}, {
						name: i18next.t('Category D'),
						data: seriesD,
						color: "#f2dede"
					}]
				});

				/*setTimeout(function () {
			chart = $('#performanceChartDataSummary[data-highcharts-chart]');
			chart.highcharts().reflow();
		}, 1000);*/

			}


			function performanceChartPeriod() {
				console.log("test");
				if (self.current.year === new Date().getFullYear().toString()) {
					//First week/7 days into new month, show reporting period two months back
					var p = self.current.year;
					if (new Date().getDate() <= 7) {
						if (new Date().getMonth()-1 < 10) p += "0";
						return p + (new Date().getMonth()-1).toString();
					}
					//Else show last month
					else {
						if (new Date().getMonth() < 10) p += "0";
						return p + (new Date().getMonth()).toString();
					}
				}
				else {
					return self.current.year + "12";
				}
			}


			//Returns latest month number where data can be entered, e.g.
			self.currentReportingMonth = function() {
				return new Date().getMonth();
			};


			self.isPreviousMonth = function(month) {
				if (self.current.year != new Date().getFullYear().toString()) return true;
				else {
					if (month < new Date().getMonth()) return true;
					else return false;
				}
			};


			/** MONITORING **/
			function monitoringReport() {
				console.log("Making monitoring report");

				//Save misc parameters for report we are making
				self.current.cumulative = true;
				self.current.dataType = self.selectedMonitoringReport.id;

				//Data
				self.current.indicators = self.selectedVaccines;
				self.current.target = self.selectedMonitoringReport.id === "allVac" ? self.selectedTarget.id : self.current.indicators.denominator;
				self.current.denominatorIds = self.selectedMonitoringReport.id === "allVac" ? [] : [self.current.indicators.denominator];

				self.current.dataIds = monitoringReportDataIds();

				//Period
				self.current.timeSeries = timeSeries();

				//Orgunit
				self.current.orgunits = self.selectedOrgunit;

				var dx = self.current.dataIds;




				//fetch metadata and data
				//Need to check whether denominator is annualized, or if we should annualize it
				var promises = [];
				var objectsPromise = d2Meta.objects("indicators", self.current.denominatorIds, "id,annualized", "annualized:eq:true", false);
				objectsPromise.catch(function(){console.log("some promise failed");}).then(function(){console.log("d2Meta promise completed");});

				promises.push();

				//fetch data - one year at the time
				for (var i = 0; i < self.current.timeSeries.length; i++) {
					console.log("adding request to promise: " + self.current.timeSeries[i].periods);
					d2Data.addRequest(dx, self.current.timeSeries[i].periods, self.selectedOrgunit.boundary.id, null, null);
				}

				var prom = d2Data.fetch();
				prom.catch(function(){console.log("some promise failed");}).then(function(){console.log("d2Data promise completed");});

				promises.push(prom);

				$q.all(promises).then(function(datas) {

					self.current.annualizedDenominators = datas[0];

					self.current.d2meta = datas[1];
					monitoringReportProcessData();
				});
			}


			function monitoringReportProcessData() {
				//Iterate over periods / orgunits / data
				self.current.data = [];

				var ou = self.current.orgunits.boundary.id;

				var chartSeries = [];

				//multiple vaccines for one year
				if (self.current.dataType === "allVac") {
					var periods = self.current.timeSeries[0].periods;

					chartSeries.push({
						"name": "Target",
						"borderDash": [5, 5],
						"radius": 0,
						"color": "#FFA500",
						"lineWidth": 4,
						"marker": {
							"enabled": false
						},
						"data": monitoringReportValue(periods, ou, self.current.target, true)
					});

					var indicators = d2Utils.toArray(self.current.indicators);
					for (var i = 0; i < indicators.length; i++) {
						chartSeries.push({
							"name": indicators[i].displayName,
							"data": monitoringReportValue(periods, ou, indicators[i].vaccineTarget, false)
						});
					}
					self.current.title = self.current.orgunits.boundary.displayName;
					self.current.subtitle = self.current.timeSeries[0].year;

				}
				//one vaccine for multiple years
				else {
					var dataId = self.current.indicators.vaccineTarget;

					chartSeries.push({
						"name": "Target (" + self.current.timeSeries[0].year + ")",
						"borderDash": [5, 5],
						"radius": 0,
						"color": "#FFA500",
						"lineWidth": 4,
						"marker": {
							"enabled": false
						},
						"data": monitoringReportValue(self.current.timeSeries[0].periods, ou, self.current.target, true)
					});
					

					for (var i = 0; i < self.current.timeSeries.length; i++) {
						var timeSeries = self.current.timeSeries[i];
						chartSeries.push({
							"name": timeSeries.year,
							"data": monitoringReportValue(timeSeries.periods, ou, dataId, false)
						});
					}

					self.current.title = self.current.orgunits.boundary.displayName;
					self.current.subtitle = d2Data.name(self.current.indicators.vaccineTarget);
				}

				monitoringChart(chartSeries);
			}


			function monitoringReportValue(periods, orgunit, dataId, annualize) {

				var value, cumulatedValue = 0;
				var dataSeries = [];
				for (var i = 0; i < periods.length; i++) {

					//Get data for current month
					value = d2Data.value(dataId, periods[i], orgunit, null, null);

					if (annualize && !annualized(dataId)) value = Math.round(value/12);

					cumulatedValue += !value ? 0 : value;
					dataSeries.push(cumulatedValue);
				}

				return dataSeries;
			}


			function monitoringReportDataIds() {
				var dataIds = [];

				var indicators = d2Utils.toArray(self.current.indicators);
				for (var i = 0; i < indicators.length; i++) {
					dataIds.push(indicators[i].vaccineTarget);
				}

				//Denominator to use (for all)
				dataIds.push(self.current.target); 


				return dataIds;
			}


			function monitoringChart(series) {

				console.log(series);

				var colors = ["#7cb5ec", "#434348", "#90ed7d", "#f7a35c", "#8085e9", "#f15c80", "#e4d354", "#2b908f", "#f45b5b", "#91e8e1"];
				
				let config = {
					type: "line",
					options: {
						responsive: true,
						legend: {
							position: "right",
							align: "center",
							usePointStyle: true
						},
						maintainAspectRatio: false
					},
					data: {
						labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
						datasets: series.map(function(item){
							var color = item.color;
							if ( !color ) {
								var index = series.indexOf(item)-1;
								color = colors[index]; //TODO: wrap around if more than 10
								item.color = color;
							}
							
							return Object.assign(item, {
								label: item.name, 
								fill: false,
								borderColor: item.color,
								backgroundColor: item.color
							});
						})
					}
				};
				
				var ctx = document.getElementById("monitoringChart").getContext("2d");
				
				if ( self.monitorChart !== null ) {
					self.monitorChart.destroy();
				}

				self.monitorChart = new Chart(ctx, config);
				/*var monitoringChart = Highcharts.chart("monitoringChart", {
					title: {
						text: ""
					},
					xAxis: { 
						title: {
							text: "Month"
						},
						categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
							"Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
					},
					yAxis: {
						title: {
							text: "Doses administered"
						},
						plotLines: [{
							value: 0,
							width: 1,
							color: "#808080"
						}]
					},
					legend: {
						layout: "vertical",
						align: "right",
						verticalAlign: "middle",
						borderWidth: 0
					},
					series: series
				});*/

				//setTimeout(function(){ monitoringChart.reflow(); }, 1000);
			}


			self.monitoringTargetOptions = function() {

				if (self.selectedReport.id != "mon" || self.selectedMonitoringReport.id != "allVac") return;


				//Get possible targets (denominators) from the selected vaccines
				self.targets = [];
				var selected = d2Utils.toArray(angular.copy(self.selectedVaccines));
				for (var i = 0; i < selected.length; i++) {
					self.targets.push({
						"id": selected[i].denominator,
						"displayName": d2Map.d2NameFromID(selected[i].denominator)
					});
				}

				self.targets = d2Utils.arrayRemoveDuplicates(self.targets, "id");

			};


			/** RIM EXPORT **/
			var chaine_cumule = [];
			function rimExport() {
				self.hideLeftMenu();

				self.rim = {
					done: false,
					activity: i18next.t('Identifying data')
				};
				//First get all RIM variables (codes)
				d2Map.rimCodes().then(function(codes) {

					var promises = [];

					//Query for these codes in DHIS
					var start = 0, end = 50, filter = "";
					while (start < codes.length && end <= codes.length) {
						filter = "code:in:[" + codes.slice(start, end).join(",") + "]";
						promises.push(d2Meta.objects("indicators", null, "id,numerator,code", filter, false));
						start = end;
						end += 50;
						if (end > codes.length) end = codes.length;
					}

					//Save the ones that are in DHIS, and have been configured
					$q.all(promises).then(function(datas) {
						var indicatorIds = [];
						self.rim.indicators = [];
						for (var i = 0; i < datas.length; i++) {
							for (var j = 0; j < datas[i].length; j++) {
								if (datas[i][j].numerator != "") {
									indicatorIds.push(datas[i][j].id);
									self.rim.indicators.push(datas[i][j]);
								}
							}
						}
						
									var compt =  self.selectedMonth.id*1;
									var pad = "00";
									var str2 ="";
									var zperiode = '';
									var si_dernier = false;
									
									for (compte2 = compt; compte2 >= 1; compte2--){
										str2 =pad+compte2;
										str2 = str2.substring(str2.length-2,str2.length);
										zperiode+=";"+self.selectedPeriod.id+str2;
										periode = zperiode.substring(1,zperiode.length);
								

						var rimMeta = d2Map.rimMeta();
						var pe = self.selectedPeriod.id + str2;
						var ouLevel = rimMeta.districtLevel;

						var completenessIds = [rimMeta.dataSetId + ".EXPECTED_REPORTS", rimMeta.dataSetId + ".ACTUAL_REPORTS",
							rimMeta.dataSetId + ".ACTUAL_REPORTS_ON_TIME"];
						d2Data.addRequest(completenessIds, pe, null, ouLevel, null, null);

						//Request the data
						var start = 0, end = 10;
						if (end > indicatorIds.length) end = indicatorIds.length;
						while (start < indicatorIds.length && end <= indicatorIds.length) {
							d2Data.addRequest(indicatorIds.slice(start, end), pe, null,
								ouLevel, null, null);

							start = end;
							end += 10;
							if (end > indicatorIds.length) end = indicatorIds.length;
						}
						self.rim.activity = i18next.t('Downloading data');
						d2Data.fetch().then(function (meta) {
							if(str2*1 == 1) si_dernier = true;
							rimProcessData(meta, indicatorIds, str2);
						});
						
										}  
										monhorloge = setInterval(function(){
											
											if(compteur_fin_export == self.selectedMonth.id*1){
												makeExportFile(i_tab, i18next.t("RIM_export"));
												compteur_fin_export=0;
												self.rim.done = !0; self.showLeftMenu();
												clearTimeout(monhorloge);
												
											}
										}, 2000);		
						
					});

				});

			}


			function rimCodeFromId(id) {
				for (var i = 0; i < self.rim.indicators.length; i++) {
					if (self.rim.indicators[i].id === id) return self.rim.indicators[i].code;
				}
				return false;
			}

			 var i_tab = []; 
			 var compteur_fin_export = 0; 
			 
			function rimProcessData(metaData, indicatorIds, si_derniere_pe) {
				compteur_fin_export++;
				
				//Store data in array of arrays, which we can covert to CSV
				
				//Rim metadata
				var rimMeta = d2Map.rimMeta();

				//Period (ISO)
				var pe = metaData.pe[0];

				//Year
				var year = pe.substr(0,4);

				//Month
				var month = pe.substr(4,2);

				//Country_Code
				var countryCode = d2Map.rimMeta().countryCode;

				//Districts to iterate over
				var districts = metaData.ou;

				var header = ["Country_Code", "Province_Name", "District", "Year", "Month", "TotalNumHF",
					"NumHFReportsIncluded", "NumHFReportsTimely"];
				for (var i = 0; i < indicatorIds.length; i++) {
					header.push(rimCodeFromId(indicatorIds[i]));
				}
				
				if(compteur_fin_export == 1 ) i_tab.push(header);
				var districtId;
				for (var i = 0; i < districts.length; i++) {
					districtId = districts[i];
					var row = [];

					//Add metadata
					row.push(countryCode);
					row.push(metaData.items[metaData.ouHierarchy[districtId].split("/")[rimMeta.provinceLevel-1]].name);
					row.push(metaData.items[districtId].name);
					row.push(year);
					row.push(month);


					//Add completeness
					row.push(d2Data.value(rimMeta.dataSetId + ".EXPECTED_REPORTS", pe, districtId, null, null));
					row.push(d2Data.value(rimMeta.dataSetId + ".ACTUAL_REPORTS", pe, districtId, null, null));
					row.push(d2Data.value(rimMeta.dataSetId + ".ACTUAL_REPORTS_ON_TIME", pe, districtId, null, null));

					//Iterate over indicators
					for (var j = 0; j < indicatorIds.length; j++) {
						row.push(d2Data.value(indicatorIds[j], pe, districtId, null, null));
					}

					i_tab.push(row);
				}
				
				if(compteur_fin_export == self.selectedMonth.id*1) self.rim.done = !0; 
			}



			/** GENERAL CONFIGURATION **/
			self.adm = {
				indicators: function(code) {return d2Map.indicators(code);},
				indicatorDelete: function (code) { return d2Map.indicatorDelete(code);},
				indicatorSave: function (indicator) {
					d2Map.indicatorAddEdit(indicator.displayName, indicator.vaccineAll.id, indicator.vaccineTarget.id,
						indicator.denominator.id, indicator.code);
					self.adm.i = null;

					self.vaccines = d2Map.indicatorsConfigured();

				},
				i: null,
				dropouts: function (code) {return d2Map.dropouts(code);},
				dropoutDelete: function (code) { return d2Map.dropoutDelete(code);},
				dropoutSave: function (dropout) {
					d2Map.dropoutAddEdit(dropout.displayName, dropout.vaccineFrom.code, dropout.vaccineTo.code, dropout.code);
					self.adm.d = null;
				},
				performance: function () {return d2Map.performance();},
				performanceSave: function (perf) {
					d2Map.performanceAddEdit(perf.indicator.code, perf.dropout.code, perf.code);
				},
				performanceLoad: function() {
					console.log(self.adm.p);
					if (typeof self.adm.p.dropout === "string") {
						self.adm.p.dropout = d2Map.dropouts(self.adm.p.dropout);
						self.adm.p.indicator = d2Map.indicators(self.adm.p.indicator);
					}

				},
				name: function (id) {return d2Map.d2NameFromID(id);}
			};


			/** RIM CONFIGURATION **/
			self.rimConfig = function () {
				var currentMeta = d2Map.rimMeta();
				if (!self.rim) {
					self.rim = {
						"stock": true,
						"outreach": false,
						"aefi": false,
						"countryCode": "",
						"districtLevel": null,
						"provinceLevel": null,
						"dataset": null,
						"overwrite": false
					};
				}
				self.rim.options = {
					orgunitLevelsDistrict: [],
					orgunitLevelsProvince: [],
					dataSets: []
				};
				self.rim.countryCode = currentMeta.countryCode;

				//Fetch required metadata for configuration options
				d2Meta.objects("dataSets", null, null, null, false).then(function (datasets) {
					self.rim.options.dataSets = datasets;
					if (currentMeta.dataSetId) {
						for (var i = 0; i < datasets.length; i++) {
							if (datasets[i].id === currentMeta.dataSetId) self.rim.dataset = datasets[i];
						}
					}
				});
				d2Meta.objects("organisationUnitLevels", null, "displayName,id,level", null, false).then(function (ouLevels) {
					ouLevels = d2Utils.arraySortByProperty(ouLevels, "level", true, true);

					self.rim.options.orgunitLevelsDistrict = ouLevels;
					self.rim.options.orgunitLevelsProvince = ouLevels;

					if (currentMeta.provinceLevel) {
						for (var i = 0; i < ouLevels.length; i++) {
							if (ouLevels[i].level === currentMeta.provinceLevel) self.rim.provinceLevel = ouLevels[i];
							if (ouLevels[i].level === currentMeta.districtLevel) self.rim.districtLevel = ouLevels[i];
						}
					}
				});

				//Get codes
				d2Map.rimVaccineCodes().then(function (vaccines) {
					self.rim.vaccineCodes = vaccines;
				});

				//Get indicator templates
				d2Map.rimIndicatorTemplate().then(function (indicators) {
					self.rim.indicatorTemplate = indicators;
				});

				//Get current user id
				d2Meta.currentUser().then(function(user) {
					self.rim.userId = user.id;
				});

				//Get user group template
				d2Map.rimUserGroup().then(function(userGroup) {
					self.rim.userGroup = userGroup;
				});

				//Get indicator group template
				d2Map.rimIndicatorGroup().then(function(indicatorGroup) {
					self.rim.indicatorGroup = indicatorGroup;
				});

				//Get indicator type to use (reuse if possible, else add)
				d2Meta.objects("indicatorTypes", null, "displayName,id,number,factor", "factor:eq:1", false).then(function(indicatorTypes) {

					//if nothing, use our template
					if (indicatorTypes.length === 0) {
						d2Map.rimIndicatorType().then(function(indicatorType) {
							self.rim.indicatorType = indicatorType;
						});
					}

					//if one, use that
					else if (indicatorTypes.length === 1) {
						self.rim.indicatorType = indicatorTypes[0];
					}

					//if multiple, try to find one where factor = 1 AND number = true, else use the first
					else {
						self.rim.indicatorTypes = indicatorTypes[0];
						for (var i = 0; i < indicatorTypes.length; i++) {
							if (indicatorTypes[i].number) {
								self.rim.indicatorType = indicatorTypes[i];
								break;
							}
						}
					}
				});
			};


			self.rimUpdate = function() {
				console.log("Updating RIM setting");

				d2Map.rimUpdateConfig(self.rim.dataset.id, self.rim.districtLevel.level, self.rim.provinceLevel.level,
					self.rim.countryCode).then(function(result) {

					if (result.status === 200) alert("Update done");
				});
			};


			self.rimImport = function(overwrite) {
				console.log("Importing RIM indicators");

				var stock = self.rim.stock;
				var outreach = self.rim.outreach;
				var aefi = self.rim.aefi;

				var indicator, indicators = [], skipped = [];
				for (var i = 0; i < self.rim.indicatorTemplate.length; i++) {
					indicator = self.rim.indicatorTemplate[i];

					var match = false;
					for (var j = 0; j < self.rim.vaccineCodes.length && !match; j++) {
						vacc = self.rim.vaccineCodes[j];

						var stockCode = false;
						for (var k = 0; k < vacc.codeStock.length && !stockCode; k++) {
							if (indicator.code.startsWith(vacc.codeStock[k])) stockCode = true;
						}

						if (stockCode) {
							match = true;
							if (vacc.selected && stock) {
								indicators.push(indicator);
							}
							else {
								skipped.push(indicator.name);
							}
						}
						else if (indicator.code.startsWith(vacc.codeVacc)) {
							match = true;
							if (vacc.selected &&
						!(indicator.code.endsWith("Avail") || indicator.code.endsWith("Used"))) {
								if (outreach && (indicator.code.endsWith("_Static") || indicator.code.endsWith("_Out"))) {
									indicators.push(indicator);
								}
								else if (!outreach && !(indicator.code.endsWith("_Static") || indicator.code.endsWith("_Out"))) {
									indicators.push(indicator);
								}
								else {
									skipped.push(indicator.name);
								}
							}
							else {
								skipped.push(indicator.name);
							}
						}
						else if (indicator.code.startsWith(vacc.codeAEFI)) {
							match = true;
							if (vacc.selected && aefi) {
								indicators.push(indicator);
							}
							else {
								skipped.push(indicator.name);
							}
						}
					}

					if (!match) indicators.push(indicator);

				}

				//Add current user to user group
				self.rim.userGroup.users.push({"id": self.rim.userId});

				//Add indicator group
				self.rim.indicatorGroup.userGroupAccesses = [{
					"id": self.rim.userGroup.id
				}];

				//Add indicator type and user group to each indicator
				for (var i = 0; i < indicators.length; i++) {
					indicators[i].indicatorType = {
						"id": self.rim.indicatorType.id
					};
					indicators[i].userGroupAccesses = [{
						"id": self.rim.userGroup.id,
						"userGroupUid": self.rim.userGroup.id,
						"access": "rw------"
					}];

					self.rim.indicatorGroup.indicators.push({
						"id": indicators[i].id
					});
				}

				//Make metadata object
				var metaData = {
					"userGroups": [self.rim.userGroup],
					"indicatorGroups": [self.rim.indicatorGroup],
					"indicators": indicators
				};

				//If we're not reusing an indicatorType, add indicatorType as well
				if (self.rim.indicatorType.id === "kHy61PbChXR") {
					metaData.indicatorTypes = [self.rim.indicatorType];
				}

				var strategy = "CREATE";
				if (self.rim.overwrite) strategy = "CREATE_AND_UPDATE";
				var ugid = self.rim.userGroup.id;
				d2Meta.postMetadata(metaData, strategy).then(function(data){
					d2Map.rimImported(ugid, self.rim.dataset.id, self.rim.districtLevel.level, self.rim.provinceLevel.level,
						self.rim.countryCode);

					var result = "Import done. Imported " + data.data.stats.created + ", updated " +
				data.data.stats.updated + ", ignored " + data.data.stats.ignored + " [RIM] indicators.";
					alert(result);

					//Temporary sharing workaround
					shareQueuePop();
				});


				//Temporary sharing workaround
				self.shareQueue = [];
				var shareObject = {
					"object": {
						"publicAccess": "--------",
						"userGroupAccesses": [
							{
								"id": self.rim.userGroup.id,
								"userGroupUid": self.rim.userGroup.id,
								"access": "rw------"
							}
						]
					}
				};

				self.shareQueue.push({
					"id": self.rim.indicatorGroup.id,
					"type": "indicatorGroup",
					"sharing": shareObject
				});
				self.shareQueue.push({
					"id": self.rim.userGroup.id,
					"type": "userGroup",
					"sharing": shareObject
				});
				for (var i = 0; i < indicators.length; i++) {
					self.shareQueue.push({
						"id": indicators[i].id,
						"type": "indicator",
						"sharing": shareObject
					});
				}

			};


			function shareQueuePop() {

				var obj = self.shareQueue.pop();
				if (!obj) return;

				d2Meta.setSharing(obj.id, obj.type, obj.sharing).then(function(data) {
					shareQueuePop();
				});
			}



			/** COMMON **/
			function monthsInYear(year) {
				var periods = [];
				var months = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
				for (var i = 0; i < months.length; i++) {
					periods.push(year + months[i]);
				}
				return periods;
			}


			function timeSeries() {
				var series = [];
				series.push({
					"base": true,
					"year": self.selectedPeriod.id,
					"periods": monthsInYear(self.selectedPeriod.id)
				});

				if (self.selectedMonitoringReport.id === "allVac") return series;

				var currentYear = parseInt(self.selectedPeriod.id);
				for (var i = 0; i < self.selectedReferencePeriods; i++) {
					currentYear = currentYear - 1;
					var periods = monthsInYear(currentYear);
					series.push({
						"base": false,
						"year": currentYear,
						"periods": periods
					});
				}

				return series;
			}


			function annualized(id) {
				for (var i = 0; i < self.current.annualizedDenominators.length; i++) {
					if (self.current.annualizedDenominators[i].id === id) return true;
				}
				return false;
			}


			/** NAVIGATION **/
			self.showLeftMenu = function () {
				document.getElementById("leftNav").style.width = "350px";
				document.getElementById("content").style.marginLeft = "360px";
			};


			self.hideLeftMenu = function () {
				document.getElementById("leftNav").style.width = "0px";
				document.getElementById("content").style.marginLeft = "10px";

			};


			self.showRightMenu = function () {
				document.getElementById("rightNav").style.width = "100%";
			};


			self.hideRightMenu = function () {
				document.getElementById("rightNav").style.width = "0%";
			};


			/** CSV EXPORT **/
			function makeExportFile(table, fileName) {
				var string, csvContent = "";
				var s = self.file.separator;

				//Header
				var headers = table[0];
				string = "";
				for (var i = 0; i < headers.length; i++) {
					string += checkExportValue(headers[i]);
					if (i+1 < headers.length) string += s;
					else string += "\n";
				}
				csvContent += string;

				for (var i = 1; i < table.length; i++) {
					string = "";
					var row = table[i];
					for (var j = 0; j < row.length; j++) {
						var value = row[j];
						if (isNumeric(value)) {
							value = fixDecimalsForExport(value);
						}
						string += checkExportValue(value);
						if (j+1 < row.length) string += s;
						else string += "\n";
					}
					csvContent += string;
				}

				var blob = new Blob([csvContent], {type: "text/csv;charset=utf-8"});
				FileSaver.saveAs(blob, fileName + ".csv");
			}


			function isNumeric(string){
				return !isNaN(string);
			}


			function fixDecimalsForExport(value) {
				if (!value) return value;
				value = value.toString();
				if (value.length > 3 && value.indexOf(".0") === (value.length - 2)) {
					value = value.slice(0, - 2);
				}
				else {
					value = value.replace(",", self.file.decimal);
					value = value.replace(".", self.file.decimal);
				}
				return value;
			}


			function checkExportValue(value, separator) {
				var innerValue = (value == null || value == undefined) ? "" : value.toString();
				var result = innerValue.replace(/"/g, "\"\"");
				if (result.search(/("|separator|\n)/g) >= 0)
					result = "\"" + result + "\"";
				return result;
			}


			/** INIT **/
			function init() {

				//Vaccine options
				self.vaccines = d2Map.indicatorsConfigured();
				self.selectedVaccines;

				//Target options
				self.targets = [];
				self.selectedTarget;


				//Period options
				self.periods = [{"displayName": "2018", "id": "2018"}, {"displayName": "2017", "id": "2017"}, {"displayName": "2016", "id": "2016"},{"displayName": "2015", "id": "2015"},
					{"displayName": "2014", "id": "2014"},{"displayName": "2013", "id": "2013"}];
				self.selectedPeriod = self.periods[0];


				self.months = [ {"displayName": i18next.t('January'), "id": "01"}, {"displayName": i18next.t('February'), "id": "02"}, {"displayName": i18next.t('March'), "id": "03"}, {"displayName": i18next.t('April'), "id": "04"}, {"displayName": i18next.t('May'), "id": "05"}, {"displayName": i18next.t('June'), "id": "06"}, {"displayName": i18next.t('July'), "id": "07"}, {"displayName": i18next.t('August'), "id": "08"}, {"displayName": i18next.t('September'), "id": "09"}, {"displayName": i18next.t('October'), "id": "10"}, {"displayName": i18next.t('November'), "id": "11"}, {"displayName": i18next.t('December'), "id": "12"} ];
				self.selectedMonth = null;


				//Parameters
				self.current = {
					"title": "[No data]"
				};


				self.file = {
					"separator": ",",
					"decimal": "."
				};

				//Report type
				self.reportTypes = [
					{
						"displayName": i18next.t('Vaccines - doses and coverage'),
						"id": "vac"
					},
					{
						"displayName": i18next.t('Performance - coverage vs dropout rate'),
						"id": "perf"
					},
					{
						"displayName": i18next.t('Monitoring chart'),
						"id": "mon"
					}
				];
				self.selectedReport = self.reportTypes[0];


				//Report subtype
				self.vaccineReportTypes = [
					{
						"displayName": i18next.t('Multiple vaccines for one orgunit'),
						"id": "allVac"
					},
					{
						"displayName": i18next.t('One vaccine for multiple orgunits'),
						"id": "oneVac"
					}
				];
				self.selectedVaccineReport = self.vaccineReportTypes[0];

				//Report subtype
				self.monitoringReportTypes = [
					{
						"displayName": i18next.t('Multiple vaccines for one year'),
						"id": "allVac"
					},
					{
						"displayName": i18next.t('One vaccine for multiple years'),
						"id": "oneVac"
					}
				];
				self.selectedMonitoringReport = self.monitoringReportTypes[0];

			}


			function initRim() {
				d2Map.rimAccess().then(function(rimAccess) {
					self.rimAccess = rimAccess;

					if (self.rimAccess) {
						self.reportTypes.push(
							{
								"displayName": i18next.t('RIM Export'),
								"id": "rim"
							}
						);
					}
				});
			}


			d2Meta.authorizations().then(function(authorities) {
				self.admin = false;
				for (var i = 0; i < authorities.length; i++) {
					if (authorities[i] === "ALL" || authorities[i] === "F_INDICATOR_PUBLIC_ADD") {
						self.admin = true;
						return;
					}
				}

			});


			d2Map.load().then(function(success) {
				self.ready = true;
				init();
				initRim();
			});


			return self;
	
		}]);
