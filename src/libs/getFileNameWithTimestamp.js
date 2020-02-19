import "../libs/padStart";

function getFileNameWithTimeStamp(fileName, extensionWithoutDot) {
    var date = new Date();
    var year = date.getFullYear();
    var month = `${date.getMonth() + 1}`.padStart(2, "0");
    var day =`${date.getDate()}`.padStart(2, "0");
    var hours =`${date.getHours()}`.padStart(2, "0");
    var min =`${date.getMinutes()}`.padStart(2, "0");
    var sec =`${date.getSeconds()}`.padStart(2, "0");

    return `${fileName}_${year}-${month}-${day}_${hours}_${min}_${sec}.${extensionWithoutDot}`;
}

module.exports = getFileNameWithTimeStamp;