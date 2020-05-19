module.exports = {
    "env": {
        "browser": true,
        "es6": true
    },
    "extends": "eslint:recommended",
    "parserOptions": {
        "sourceType": "module"
    },
    "rules": {
		"indent": [
			"error",
			4
		],
		"quotes": [
			"error",
			"double"
		],
		"semi": [
			"error",
			"always"
		],
		"no-console": "off"
	},
	"globals": {
		"angular": true,
		"require": true,
		"d3": true,
		"__dirname": true,
		"process": true,
		"module": true,
		"i18next": true,
		"DHIS_CONFIG": true
	}
};
