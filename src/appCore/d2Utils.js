/**
 © Copyright 2017 the World Health Organization (WHO).
 This software is distributed under the terms of the GNU General Public License version 3 (GPL Version 3),
 copied verbatim in the file “COPYING”.  In applying this license, WHO does not waive any of the privileges and
 immunities enjoyed by WHO under national or international law or submit to any national court jurisdiction.
 */

export default function () {

    var utils = {
        isNumber: isNumber,
        isArray: isArray,
        toArray: toArray,
        arrayRemoveDuplicates: arrayRemoveDuplicates,
        arrayMerge: arrayMerge,
        arraySortByProperty: arraySortByProperty,
        arrayFromKeys: arrayFromKeys,
        arrayProperties: arrayProperties,
        round: round,
        idsFromIndicatorFormula: idsFromIndicatorFormula
    };


    /** === NUMBER === */
    function isNumber(number) {

        return !isNaN(parseFloat(number));

    }


    /** === ARRAY === */
    function isArray(array) {
        var isArray = Object.prototype.toString.call( array ) === "[object Array]";

        return isArray;
    }

    function toArray(array) {
        var isArray = Object.prototype.toString.call( array ) === "[object Array]";

        if (isArray) return array;
        else return [array];
    }


    function arrayRemoveDuplicates(array, property) {
        var seen = {};
        return array.filter(function(item) {
            if (property) {
                return seen.hasOwnProperty(item[property]) ? false : (seen[item[property]] = true);
            }
            else {
                return seen.hasOwnProperty(item) ? false : (seen[item] = true);
            }
        });
    }

    function arrayMerge(a, b) {
        if (a && !isArray(a)) a = [a];
        if (b && !isArray(b)) b = [b];

        if (!a && b) return b;
        if (!b && a) return a;

        for (let i = 0;a && b &&  i < b.length; i++) {
            a.push(b[i]);
        }
        return a;
    }

    function arraySortByProperty(array, property, numeric, reverse) {

        return array.sort(function(a, b) {
            var res;
            if (numeric) {
                res = b[property] - a[property] ;
            }
            else {
                res = a[property] < b[property] ? -1 : 1;
            }
            if (reverse) return -res;
            else return res;
        });

    }

    function arrayFromKeys(obj) {
        var array = [];
        for (let key in obj) {
            if (obj.hasOwnProperty(key)) {
                array.push(key);
            }
        }
        return array;

    }

    function arrayProperties(array, property) {
        var properties = [];
        for (let i = 0; i < array.length; i++) {
            properties.push(array[i][property]);
        }
        return properties;
    }


    /** === INDICATORS === */
    function idsFromIndicatorFormula(numeratorFormula, denominatorFormula, dataElementOnly) {

        var matches = arrayMerge(numeratorFormula.match(/#{(.*?)}/g), denominatorFormula.match(/#{(.*?)}/g));
        if (!matches) return [];

        for (let i = 0; i < matches.length; i++ ) {
            matches[i] = matches[i].slice(2, -1);
            if (dataElementOnly) matches[i] = matches[i].split(".")[0];
        }

        return arrayRemoveDuplicates(matches);
    }

    function round(value, decimals) {
        if (!value) return value;

        var factor = Math.pow(10,decimals);
        return Math.round(value*factor)/factor;

    }
	
	
	
    return utils;

}
