
export default function($uibModal) {

	var self = this;
	self.notify = notification;

	function notification(title, message) {
		console.log(title);
		var modalInstance = $uibModal.open({
			template: require("../appCommons/modalNotification.html"),
			controller: "ModalNotificationController",
			controllerAs: "nCtrl",
			resolve: {
				title: function () {
					return title;
				},
				message: function () {
					return message;
				}
			}
		});

		return modalInstance.result;
	}

	return self;

}