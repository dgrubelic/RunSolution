'use strict';

/**
 * @ngdoc overview
 * @name runtasticContestApp
 * @description
 * # runtasticContestApp
 *
 * Main module of the application.
 */
(function (global) {
	'use strict';

	var app = angular
		.module('runtasticContestApp', [
		'ngRoute',
		'ngSanitize',
		'ngTouch'
		])
		.config(['$routeProvider', '$locationProvider', function ($routeProvider, $locationProvider) {
			$locationProvider.html5Mode({
				enabled: false,
				requireBase: false
			});

			$routeProvider
				.when('/session', {
					templateUrl: '/views/session/list.html',
					controller: 'SessionListController'
				})
				.when('/session/:session_id', {
					templateUrl: '/views/session/details.html',
					controller: 'SessionController'
				})
				.otherwise({
					redirectTo: '/session'
				});
		}]);

	app.constant('api_domain', '//intense-bastion-3210.herokuapp.com');

	app.service('Repository', ['$http', 'api_domain', function ($http, api_domain) {
		return {
			get: function (url, params) {
				return $http.get(api_domain + url, {
					params: params
				});
			}
		}
	}]);

	app.service('SessionRepository', ['$location', 'Repository', function ($location, Repository) {
		var lastPage = 1;

		var SessionRepository = {
			getLastPage: function () {
				return lastPage;
			},

			getList: function (pagination) {
				return Repository.get('/run_sessions.json', pagination).then(function (response) {
					var meta = response.data.meta;

					// Update last page
					lastPage = meta.pagination.page;

					// Update url query parameters
					$location.search('page', meta.pagination.page);

					// pagination.page 			= meta.pagination.page;
					pagination.per_page 		= meta.pagination.per_page;
					pagination.available_pages 	= meta.pagination.available_pages;
					pagination.total 			= meta.pagination.total;

					return response.data.run_sessions;
				});
			},

			getSession: function (sessionId) {
				return Repository.get('/run_sessions/' + sessionId + '.json').then(function (response) {
					return response.data.run_session;
				});
			}
		};

		return SessionRepository;
	}]);

	app.factory('Pagination', [function () {
		// "per_page": 15,
		// "available_pages": <available_pages>,
		// "total": <total_entries>,
		// "page": <current_page>,
		// "sort_by": <sort_attribute>,
		// "order": <current_sort_order> 

		var PaginationService = function () {
			this.page 				= 1;
			this.available_pages 	= 1;
			this.total 				= 0;
			this.per_page 			= 15;
			this.sort_by 			= 'start_time';
			this.order 				= 'desc';
		};

		return new PaginationService();
	}]);

	app.directive('paging', ['$routeParams', function ($routeParams) {
		return {
			restrict: 	'E',
			replace: 	true,
			scope: {
				paging: 		'=paging',
				onPageChange: 	'&onPageChange'
			},

			template: [
				'<div class="paging">',
					'<h4 class="summary">{{paging.page}} of {{paging.available_pages}}</h4>',
					'<ul class="pages">',
						'<li class="previous" ng-click="previousPage()">Previous</li>',
						'<li ng-repeat="page in pages" ng-click="changePage(page)" ng-class="{current: (page === paging.page)}">',
							'{{page}}',
						'</li>',
						'<li class="next" ng-click="nextPage()">Next</li>',
					'</ul>',
				'</div>'
			].join(''),

			link: function (scope, element, attrs) {
				var totalPagesRendered = 7;
				scope.pages = [];

				scope.previousPage = function () {
					var currentPage = parseInt(scope.paging.page, 10);
					if (currentPage > 1) {
						currentPage -= 1;
					}

					scope.changePage(currentPage);
				};

				scope.nextPage = function () {
					var currentPage = parseInt(scope.paging.page, 10);
					currentPage += 1;

					scope.changePage(currentPage);
				};

				scope.changePage = function (page) {
					if (0 < page && page <= scope.paging.available_pages) {
						$routeParams.page = page;
						scope.paging.page = page;

						scope.onPageChange();
					}
				};

				scope.$watch('paging', function (newVal, oldVal) {
					calculatePages();
				}, true);

				function calculatePages() {
					if (!scope.paging) return;

					scope.pages.length = 0;
					
					if (scope.paging.available_pages > totalPagesRendered) {
						if (scope.paging.page < totalPagesRendered - 2) {
							for (var i = 1; i <= (totalPagesRendered - 2); i++) {
								scope.pages.push(i);
							}

							scope.pages.push(scope.paging.available_pages - 1);
							scope.pages.push(scope.paging.available_pages);

						} else if (scope.paging.page > (scope.paging.available_pages - (totalPagesRendered - 2))) {
							scope.pages.push(1);
							scope.pages.push(2);

							var pages_from = (scope.paging.available_pages - (totalPagesRendered - 2));
							var pages_to = scope.paging.available_pages;

							for (var i = pages_from; i <= pages_to; i++) {
								scope.pages.push(i);
							}
						} else {
							scope.pages.push(1);
							scope.pages.push(2);

							for (var i = (scope.paging.page - 1); i <= (scope.paging.page + 1); i++) {
								scope.pages.push(i);
							}

							scope.pages.push(scope.paging.available_pages - 1);
							scope.pages.push(scope.paging.available_pages);
						}
					} else {
						for (var i = 1; i < scope.paging.available_pages; i++) {
							scope.pages.push(i);
						}
					}
				}
			}
		};
	}]);

	app.filter('duration', [function () {
		return function (input) {
			var totalSeconds = input / 1000;

			var seconds = 0,
				minutes = 0,
				hours 	= 0;

			function parseHours(hr) {
				if ((hr - 3600) >= 0) {
					hours += 1;
					return parseHours(hr - 3600);
				} else {
					return hr;
				}
			}

			var secondsLeft = parseHours(totalSeconds);

			secondsLeft = (function parseMinutes(min) {
				if ((min - 60) >= 0) {
					minutes += 1;
					return parseMinutes(min - 60);
				} else {
					return min;
				}
			}(secondsLeft));

			seconds = secondsLeft;
			
			var output = '';
			if (hours >= 1) {
				output += (hours + 'h ');
			}

			if (minutes >= 1) {
				output += (minutes + 'm ');
			}

			if (seconds >= 1) {
				output += (Math.ceil(seconds) + 's');
			}

			return output;
		}
	}]);

	app.filter('distance', [function () {
		return function (input) {
			var totalMeters = input;

			var kilometers 	= 0,
				meters 		= 0;

			function parseKilometers(mtr) {
				if ((mtr - 1000) >= 0) {
					kilometers += 1;
					return parseKilometers(mtr - 1000);
				} else {
					return mtr;
				}
			}

			meters = parseKilometers(totalMeters);

			var output = '';
			if (kilometers >= 1) {
				output += (kilometers + 'km ');
			}

			if (meters >= 1) {
				output += (meters + 'm ');
			}

			return output;
		}
	}]);
	
	app.controller('SessionListController', ['$scope', '$location', 'SessionRepository', 'Pagination', function ($scope, $location, SessionRepository, Pagination) {
		if ($location.$$search.page) {
			Pagination.page = parseInt($location.$$search.page, 10);
		}

		$scope.pagingData 	= Pagination;


		$scope.changePage = function () {
			loadSessions();
		};

		$scope.selectSession = function (session) {
			$location.path('/session/' + session.id);
		}

		$scope.sortBy = function(sortBy) {
			if ($scope.pagingData.sort_by === sortBy) {
				if ($scope.pagingData.order === 'desc') {
					$scope.pagingData.order = 'asc';
				} else {
					$scope.pagingData.order = 'desc';
				}
			} else {
				$scope.pagingData.order = 'desc';
			}

			$scope.pagingData.sort_by = sortBy;
			loadSessions();
		}

		function loadSessions() {
			SessionRepository.getList($scope.pagingData).then(function (run_sessions) {
				$scope.sessionList 	= run_sessions;
			});
		}

		// Default load for first page
		loadSessions();
	}]);

	app.controller('SessionController', ['$scope', '$location', '$routeParams', 'SessionRepository', function ($scope, $location, $routeParams, SessionRepository) {
		$scope.lastPage = SessionRepository.getLastPage();

		SessionRepository.getSession($routeParams.session_id).then(function (session) {
			$scope.session = session;
		});
	}]);

}(this) /* Auto-invoking function */ );