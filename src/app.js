
(function(){
	var app = angular.module('epiApp',
	['ngAnimate', 'ngSanitize', 'ngRoute', 'ui.bootstrap', 'ui.select', 'nvd3', 'd2HeaderBar', 'angularBootstrapNavTree', 'd2',
		'dashboard']);
	
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
				when('/dashboard', {
					templateUrl: 'moduleCumulative/dashboard.html',
					controller: 'DashboardController',
					controllerAs: 'dashCtrl'
				}).
				otherwise({
					redirectTo: '/dashboard'
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


