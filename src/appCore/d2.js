

import "angular";

import d2Utils from "./d2Utils.js";
import d2Data from "./d2Data.js";
import d2Map from "./d2Map.js";
import d2Meta from "./d2Meta.js";

angular.module("d2", [])
	.factory("d2Utils", [d2Utils])
	.factory("d2Data", ["requestService", "d2Utils", "$q", d2Data])
	.factory("d2Map", ["requestService", "d2Meta", "d2Utils", "$q", d2Map])
	.factory("d2Meta", ["requestService", "periodService", "d2Utils", "$q", d2Meta]);

		