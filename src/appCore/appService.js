/**
 © Copyright 2017 the World Health Organization (WHO).
 This software is distributed under the terms of the GNU General Public License version 3 (GPL Version 3),
 copied verbatim in the file “COPYING”.  In applying this license, WHO does not waive any of the privileges and
 immunities enjoyed by WHO under national or international law or submit to any national court jurisdiction.
 */

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