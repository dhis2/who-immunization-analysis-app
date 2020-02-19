
if (!String.prototype.trim) {
    String.prototype.trim = function() {
        return this.replace(/^\s+|\s+$/g,"");
    };
}

if (!Array.prototype.move) {
    Array.prototype.move = function(from, to) {
        this.splice(to, 0, this.splice(from, 1)[0]);
    };
}