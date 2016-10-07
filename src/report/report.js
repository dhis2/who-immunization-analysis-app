
(function(){

	//Define module
	angular.module('report', []);

	//Define DashboardController
	angular.module('report').controller("ReportController",
	['d2Map', 'd2Meta',
	function(d2Map, d2Meta) {

	    var self = this;

		d2Map.load();

		function init() {
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
			self.selectedReport = self.reportTypes[0];

		}




		/** NAVIGATION **/
		self.showLeftMenu = function () {
			document.getElementById("leftNav").style.width = "350px";
			document.getElementById("content").style.marginLeft = "350px";
		}

		self.hideLeftMenu = function () {
			document.getElementById("leftNav").style.width = "0px";
			document.getElementById("content").style.marginLeft = "0px";
		}



		return self;
		
	}]);
})();