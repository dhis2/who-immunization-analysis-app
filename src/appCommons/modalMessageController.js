

/**Controller: Parameters*/
angular.module("appCommons").controller("ModalMessageController",
	["$uibModalInstance", "requestService", "orgunitID", "orgunitName",
		function($uibModalInstance, requestService, orgunitID, orgunitName) {

			var self = this;

			self.text = "";
			self.message = false;
			self.orgunitID = orgunitID;
			self.orgunitName = orgunitName;
			self.info = [];
			self.metaData = null;
			self.recipients = [];
			self.selectedRecipient = null;
			self.selectedUsers = [];
			self.alerts = [];


			getInformation();

			function getInformation() {
				var requestURL = "/organisationUnits/" + orgunitID + ".json?";
				requestURL += "fields=displayName,id,contactPerson,address,email,phoneNumber,users[displayName,id,phoneNumber],";
				requestURL += "parent[displayName,id,users[displayName,id,phoneNumber],parent[displayName,id,users[displayName,id,phoneNumber]]]";


				requestService.getSingle(requestURL).then(function (response) {
					self.metaData = response.data;
					setInformation();
				});
			}


			function setInformation() {
				var data = self.metaData;
				var attribute, attributes = [{
					attr: "contactPerson",
					label: "Contact person"
				},{
					attr: "address",
					label: "Adress"
				},{
					attr: "email",
					label: "Email"
				},{
					attr: "phoneNumber",
					label: "Phone number"
				},{
					attr: "users",
					label: "Users"
				},{
					attr: "parent",
					label: "Hieararchy"
				}];

				for (var i = 0; i < attributes.length; i++) {
					attribute = attributes[i];
					if (data[attribute.attr]) {


						if (attribute.attr === "users") {
							var user, users = [];
							for (var j = 0; j < data[attribute.attr].length; j++) {
								user = data[attribute.attr][j].displayName;
								if (data[attribute.attr][j].phoneNumber) {
									user += " (" + data[attribute.attr][j].phoneNumber + ")";
								}
								users.push(user);
							}

							if (users.length > 0) {
								self.info.push({
									label: attribute.label,
									value: users.join(", ")
								});
							}
						}

						else if (attribute.attr === "parent") {
							var parents = data[attribute.attr].displayName;
							if (data[attribute.attr].parent) {
								parents = data[attribute.attr].parent.displayName + " - " + parents;
							}


							self.info.push({
								label: attribute.label,
								value: parents
							});
						}

						else if (data[attribute.attr] && data[attribute.attr].length > 0) {
							self.info.push({
								label: attribute.label,
								value: data[attribute.attr]
							});
						}
					}
				}
			}


			function getPotentialRecipients() {

				if (self.recipients.length > 0) return;

				var potentialRecipients = [self.metaData, self.metaData.parent, self.metaData.parent.parent];

				for (var i = 0; i < potentialRecipients.length; i++) {
					var orgunit = potentialRecipients[i];
					if (orgunit.users && orgunit.users.length > 0) {
						self.recipients.push({
							"displayName": orgunit.displayName,
							"orgunit": orgunit.displayName,
							"id": orgunit.id,
							"users": orgunit.users
						});
					}
				}

				if (self.recipients.length === 0) {
					self.alerts.push({type: "warning", msg: "No users to send to!"});
				}
			}


			self.sendMessage = function () {
				var message = {
					"subject": "[Data Quality]",
					"text": self.text
				};

				var ids = [];
				if (self.selectedUsers.length > 0) {
					for (var i = 0; i < self.selectedUsers.length; i++) {
						ids.push({"id": self.selectedUsers[i].id});
					}
					message.users = ids;
				}
				else {
					ids.push({"id": self.selectedRecipient.id});
					message.organisationUnits = ids;
				}

				var postURL = "/messageConversations";

				console.log(message);

				requestService.post(postURL, message).
					success(function(data, status, headers, config) {
						self.alerts.push({type: "success", msg: "Message sent!"});
					}).
					error(function(data, status, headers, config) {
						self.alerts.push({type: "danger", msg: "Error sending message!"});
					});

			};


			self.enableMessage = function () {
				if (self.message) self.message = false;
				else self.message = true;

				getPotentialRecipients();
			};


			self.close = function () {
				$uibModalInstance.close(self.text);
			};

		}]);
