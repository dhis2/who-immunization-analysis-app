
(function(){

	//Define module
	angular.module('report', []);

	//Define DashboardController
	angular.module('report').controller("ReportController",
	['d2Map', 'd2Meta', 'd2Data', 'd2Utils',
	function(d2Map, d2Meta, d2Data, d2Utils) {

	    var self = this;



		self.makeReport = function() {

			self.current = {
				"type": self.selectedReport.id,
				"ouFilter": self.selectedReport.id === 'vac' && self.selectedVaccineReport.id === 'allVac'
			};

			switch (self.selectedReport.id) {
				case 'vac':
					vaccineReport();
					break;
				case 'perf':
					performanceReport();
					break;
				default:
					console.log("Not implemented");
			}

		}



		/** VACCINE REPORT **/
		function vaccineReport() {
			console.log("Making vaccine report");

			//Save misc parameters for report we are making
			self.current.dataType = self.dataType === 'cov' ? 'cov' : self.dataGroup === 'target' ? 'target' : 'all';
			self.current.cumulative = self.aggregationType === 'cumulative';
			self.current.hieararchy = self.selectedOrgunit.boundary.level > 2 ||
				(self.selectedOrgunit.level && self.selectedOrgunit.level.level > 2);

			//Data
			self.current.indicators = d2Utils.toArray(self.selectedVaccines);
			self.current.dataIds = vaccineReportDataIds();

			//Period
			self.current.periods = monthsInYear(self.selectedPeriod.id);

			//Orgunit
			self.current.orgunits = self.selectedOrgunit;

			var pe = self.current.periods;
			var dx = self.current.dataIds;

			//see if orgunit level should be used
			var level = self.current.ouFilter ? null :
				self.selectedOrgunit.level ? self.selectedOrgunit.level.level : null;

			//data
			d2Data.addRequest(dx, pe, self.selectedOrgunit.boundary.id, level, null);
			d2Data.fetch().then(
				function(data) {
					self.current.d2meta = data;
					vaccineReportProcessData();
				}
			);
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
						'vaccine': indicator.displayName,
						'vaccineCode': indicator.code,
						'ou': d2Data.name(orgunit),
						'ouId': orgunit
					};

					if (self.current.hieararchy) {
						var parentIds = hieararchy[orgunit].split('/').splice(2);
						var parentNames = [];
						for (var k = 0; k < parentIds.length; k++) {
							parentNames.push(d2Data.name(parentIds[k]));
						}

						row.parentIds = parentIds.join('/')
						row.parents = parentNames.join(' - ');
					}

					for (var k = 0; k < periods.length; k++) {
						row[periods[k]] = values[k];
					}

					self.current.data.push(row);

				}
			}

			var columns = [];

			//Add column headers
			columns.push({ id: 'ou', title: "Organisation unit" });
			columns.push({ id: 'vaccine', title: "Vaccine" });
			if (self.current.hieararchy) {
				d2Utils.arraySortByProperty(self.current.data, 'parents', false, false);
				columns.unshift({ id: 'parents', title: "Hierarchy" });
			}
			if (self.current.ouFilter) {
				//Sort data
				d2Utils.arraySortByProperty(self.current.data, 'vaccine', false, false);

				//Set title
				self.current.title = d2Data.name(orgunit);
				self.current.subtitle = periods[0].substr(0,4);
			}
			else {
				//Sort data
				d2Utils.arraySortByProperty(self.current.data, 'ou', false, false);

				//Add title
				self.current.title = self.current.indicators[0].displayName;
				self.current.subtitle = periods[0].substr(0,4);
			}

			for (var i = 0; i < periods.length; i++) {
				columns.push({
					id: periods[i], title: d2Data.name(periods[i]).split(' ')[0]
				});
			}

			self.current.dataHeader = columns;
			self.current.dataTable = angular.copy(self.current.data);
		}


		function vaccineReportValue(indicator, periods, orgunit) {
			var numeratorField = self.current.dataType === 'all' ? 'vaccineAll': 'vaccineTarget';
			var denominatorField = self.current.dataType === 'cov' ? 'denominator' : false;

			var numeratorId = indicator[numeratorField];
			var denominatorId = indicator[denominatorField];

			var cumulated = {
				"numerator": 0,
				"denominator": 0
			};

			var num, den, currentNum, currentDen;
			var dataSeries = [];
			for (var i = 0; i < periods.length; i++) {

				//Get numerator for current month
				num = d2Data.value(numeratorId, periods[i], orgunit, null, null);
				if (self.current.dataType === 'cov') {
					den = d2Data.value(denominatorId, periods[i], orgunit, null, null);

					//TODO: should have check in metadata - if indicator it could be annualized already
					den = den/12;
				}


				if (self.current.cumulative) {
					cumulated.numerator += !num ? 0 : num;
					cumulated.denominator += !den ? 0 : den;

					currentNum = cumulated.numerator;
					currentDen = cumulated.denominator;
				}
				else {
					currentNum = num;
					currentDen = den;
				}


				if (self.current.dataType === 'cov') {
					if (!currentNum || !currentDen) dataSeries.push(null);
					else dataSeries.push(d2Utils.round(100*currentNum/currentDen, 1));
				}
				else {
					if (!currentNum) dataSeries.push(null);
					else dataSeries.push(currentNum);
				}
			}

			return dataSeries;
		}


		function vaccineReportDataIds() {

			var dataFields = [];
			dataFields.push(self.current.dataType === 'all' ? 'vaccineAll': 'vaccineTarget');
			if (self.current.dataType === 'cov') dataFields.push('denominator');

			var dataIds = [];
			var indicators = d2Utils.toArray(self.selectedVaccines);
			for (var i = 0; i < indicators.length; i++) {
				for (var j = 0; j < dataFields.length; j++) {
					dataIds.push(indicators[i][dataFields[j]]);
				}
			}

			return dataIds;
		}


		function monthsInYear(year) {
			var periods = [];
			var months = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
			for (var i = 0; i < months.length; i++) {
				periods.push(year + months[i]);
			}
			return periods;
		}


		/** PERFORMANCE REPORT **/
		function performanceReport() {
			console.log("Making performance report");

			//Save misc parameters for report we are making
			self.current.cumulative = self.aggregationType === 'cumulative';
			self.current.hieararchy = self.selectedOrgunit.boundary.level > 2 ||
				(self.selectedOrgunit.level && self.selectedOrgunit.level.level > 2);

			//Data
			var perf = d2Map.performance("P1");
			self.current.performance = perf;
			self.current.indicator = d2Map.indicators(perf.indicator);
			self.current.dropout = d2Map.dropouts(perf.dropout);

			self.current.dataIds = performanceReportDataIds();

			console.log(self.current.dataIds);

			//Period
			self.current.periods = monthsInYear(self.selectedPeriod.id);

			//Orgunit
			self.current.orgunits = self.selectedOrgunit;

			var pe = self.current.periods;
			var dx = self.current.dataIds;

			//see if orgunit level should be used
			var level = self.current.ouFilter ? null :
				self.selectedOrgunit.level ? self.selectedOrgunit.level.level : null;

			//data
			d2Data.addRequest(dx, pe, self.selectedOrgunit.boundary.id, level, null);
			d2Data.fetch().then(
				function(data) {
					self.current.d2meta = data;
					performanceReportProcessData();
				}
			);
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
					'vaccine': "vac",
					'vaccineCode': "vacCode",
					'ou': d2Data.name(orgunit),
					'ouId': orgunit
				};

				if (self.current.hieararchy) {
					var parentIds = hieararchy[orgunit].split('/').splice(2);
					var parentNames = [];
					for (var k = 0; k < parentIds.length; k++) {
						parentNames.push(d2Data.name(parentIds[k]));
					}

					row.parentIds = parentIds.join('/')
					row.parents = parentNames.join(' - ');
				}

				for (var k = 0; k < periods.length; k++) {
					row[periods[k]] = values[k];
				}

				self.current.data.push(row);

			}

			var columns = [];
			var columnsData = [];

			//Add column headers
			columns.push({ id: 'ou', title: "Organisation unit" });
			d2Utils.arraySortByProperty(self.current.data, 'ou', false, false);
			if (self.current.hieararchy) {
				d2Utils.arraySortByProperty(self.current.data, 'parents', false, false);
				columns.unshift({ id: 'parents', title: "Hierarchy" });
				d2Utils.arraySortByProperty(self.current.data, 'parents', false, false);
			}


			//Add title
			self.current.title = "Performance report"; //self.current.indicators[0].displayName;
			self.current.subtitle = periods[0].substr(0,4);


			for (var i = 0; i < periods.length; i++) {
				columnsData.push({
					id: periods[i], title: d2Data.name(periods[i]).split(' ')[0]
				});
			}

			self.current.dataHeader = columns;
			self.current.dataHeaderData = columnsData;

			performanceSetCategory();
			performanceChart();

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

				//TODO: should check is annualized indicator
				covDen = covDen/12;


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

				dataSeries.push({'coverage': coverage, 'dropout': dropout, 'category': null});

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
						self.current.data[i][self.current.periods[j]].category = 'A';
					}
					else if (value.coverage >= coverageLimit && value.dropout > dropoutLimit) {
						self.current.data[i][self.current.periods[j]].category = 'B';
					}
					else if (value.coverage < coverageLimit && value.dropout <= dropoutLimit) {
						self.current.data[i][self.current.periods[j]].category = 'C';
					}
					else if (value.coverage < coverageLimit && value.dropout > dropoutLimit) {
						self.current.data[i][self.current.periods[j]].category = 'D';
					}
					else {
						self.current.data[i][self.current.periods[j]].category = false;
					}
				}
			}
		}


		function performanceReportDataIds() {

			var dataIds = [];
			dataIds.push(self.current.indicator.vaccineTarget);
			dataIds.push(self.current.indicator.denominator);

			dataIds.push(d2Map.indicators(self.current.dropout.vaccineFrom).vaccineTarget);
			dataIds.push(d2Map.indicators(self.current.dropout.vaccineTo).vaccineTarget);

			return dataIds;
		}


		function performanceChart() {

			var xMax = 100, yMax = 30;
			var datapoints = [];

			//Find the latest period with data, which we use for the chart
			var hasData = false, period;
			for (var i = 0; i < self.current.data.length; i++) {
				for (var j = self.current.periods.length; j > 0 && !hasData; j--) {
					period = self.current.periods[j-1];
					var value = self.current.data[i][period];

					hasData = value.coverage && value.dropout;
				}
			}

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

			}

			var title = self.current.cumulative ? ' (cumulative)' : '';
			title = d2Data.name(period) + title;

			yMax = Math.ceil(yMax/10)*10;
			xMax = Math.ceil(xMax/10)*10;

			$('#chart').highcharts({
					xAxis: {
						min: 0,
						max: xMax,
						title: {
							enabled: true,
							text: 'Coverage (%)'
						}
					},
					yAxis: {
						min: 0,
						max: yMax,
						title: {
							enabled: true,
							text: 'Dropout rate (%)'
						}
					},
					title: {
						text: title
					},
					tooltip: {
						formatter: function() {
							return '<b>'+ this.point.name +'</b><br/>' +
								'Coverage: ' + this.point.x +
									'% <br/>Dropout rate: ' +
									this.point.y + '%'
						}
					},
					series: [{
						type: 'line',
						name: 'Coverage = 90%',
						data: [[90, 0], [90, yMax]],
						marker: {
							enabled: false
						},
						states: {
							hover: {
								lineWidth: 0
							}
						},
						enableMouseTracking: false
					},{
						type: 'line',
						name: 'Dropout rate = 10%',
						data: [[0, 10], [xMax, 10]],
						marker: {
							enabled: false
						},
						states: {
							hover: {
								lineWidth: 0
							}
						},
						enableMouseTracking: false
					}, {
						type: 'scatter',
						name: 'Orgunits',
						data: datapoints,
						marker: {
							radius: 2
						}
					}]
			});

			setTimeout(function(){ $('#chart').highcharts().reflow(); }, 10);



		}

		/** NAVIGATION **/
		self.showLeftMenu = function () {
			document.getElementById("leftNav").style.width = "350px";
			document.getElementById("content").style.marginLeft = "350px";
		}


		self.hideLeftMenu = function () {
			document.getElementById("leftNav").style.width = "0px";
			document.getElementById("content").style.marginLeft = "10px";
		}


		/** INIT **/
		function init() {

			//Report type
			self.reportTypes = [
				{
					"displayName": "Vaccines",
					"id": "vac"
				},
				{
					"displayName": "Performance",
					"id": "perf"
				},
				{
					"displayName": "Monitoring",
					"id": "mon"
				}
			];
			self.selectedReport = self.reportTypes[1];


			//Report subtype
			self.vaccineReportTypes = [
				{
					"displayName": "Multiple vaccines for one orgunit",
					"id": "allVac"
				},
				{
					"displayName": "Multiple orgunits for one vaccine",
					"id": "oneVac"
				}
			];
			self.selectedVaccineReport = self.vaccineReportTypes[0];


			//Vaccine options
			self.vaccines = d2Map.indicators();
			self.selectedVaccines;


			//Period options
			self.periods = [{"displayName": "2016", "id": "2016"},{"displayName": "2015", "id": "2015"},
				{"displayName": "2014", "id": "2014"},{"displayName": "2013", "id": "2013"}];
			self.selectedPeriod = self.periods[0];


			//Parameters
			self.current = {
				"title": "[No data]"
			};

		}


		d2Map.load().then(function(success) {
			init();
		});


		return self;
		
	}]);
})();