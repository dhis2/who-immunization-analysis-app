
(function(){
	var app = angular.module('epiApp',
	['smart-table', 'ngAnimate', 'ngSanitize', 'ngRoute', 'ui.bootstrap', 'ui.select', 'd2HeaderBar', 'angularBootstrapNavTree', 'd2',
		'report']);
	
	/**Bootstrap*/
	angular.element(document).ready( 
		function() {
			var initInjector = angular.injector(['ng']);
			var $http = initInjector.get('$http');

			$http.get('manifest.webapp').then(
				function(response) {
					app.constant("BASE_URL", response.data.activities.dhis.href);
					angular.bootstrap(document, ['epiApp']);
				}
			);
		}
	);


	/**Config*/
	app.config(['uiSelectConfig', function(uiSelectConfig) {
		uiSelectConfig.theme = 'bootstrap';
		uiSelectConfig.resetSearchInput = true;
	}]);
	
	app.config(['$routeProvider',
		function($routeProvider) {
			$routeProvider.
				when('/report', {
					templateUrl: 'report/report.html',
					controller: 'ReportController',
					controllerAs: 'rCtrl'
				}).
				otherwise({
					redirectTo: '/report'
				});
		}]
	);


	/**Controller: Navigation*/
	app.controller("NavigationController",
	['BASE_URL', '$location', '$window', 'notificationService',
	function(BASE_URL, $location, $window, notificationService) {
		var self = this;



		return self;
	}]);

})();


