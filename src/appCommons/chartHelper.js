/**
 © Copyright 2017 the World Health Organization (WHO).
 This software is distributed under the terms of the GNU General Public License version 3 (GPL Version 3),
 copied verbatim in the file “COPYING”.  In applying this license, WHO does not waive any of the privileges and
 immunities enjoyed by WHO under national or international law or submit to any national court jurisdiction.
 */

export const addDownloadChartAsImageHandler = function(chartContainer, filenamePrefix) {
        
    var button = document.createElement("a");
    button.className = "download-button btn btn-default";
    button.innerText = i18next.t("Download as image");

    var canvas = chartContainer.querySelector("canvas");
    canvas.parentNode.insertBefore(button, canvas);
    //<a href='#' class='download-button btn btn-default'>{{\'Download as image\' | i18next}}</a>
    button.onclick = function(){
        var dataURL = canvas.toDataURL("image/png");
        var now = new Date();
        button.download = filenamePrefix + "_" + now.getFullYear() + "_" + (now.getMonth()+1) + "_" + now.getDate() + ".png";
        button.href = dataURL;
    };
};
