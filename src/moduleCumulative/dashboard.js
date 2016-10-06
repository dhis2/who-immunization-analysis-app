
(function(){

	//Define module
	angular.module('dashboard', []);

	//Define DashboardController
	angular.module('dashboard').controller("DashboardController",
	['d2Map', 'd2Meta',
	function(d2Map, d2Meta) {

	    var self = this;

		console.log("EPI APP!");

		 return self;
		
	}]);
})();