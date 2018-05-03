import "angular";

import math from "./appServiceMath.js";
import notification from "./appServiceNotification.js";
import period from "./appServicePeriod.js";
import request from "./appServiceRequest.js";

angular.module("appService", ["d2"])
	.service("mathService", [math])
	.service("notificationService", ["$uibModal", notification])
	.service("periodService", ["$i18next", period])
	.service("requestService", ["BASE_URL", "API_VERSION", "$http", "$q", "notificationService", request]);