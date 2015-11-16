/*
 * Copyright (c) 2008-2015, Massachusetts Institute of Technology (MIT)
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this
 * list of conditions and the following disclaimer.
 *
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 * this list of conditions and the following disclaimer in the documentation
 * and/or other materials provided with the distribution.
 *
 * 3. Neither the name of the copyright holder nor the names of its contributors
 * may be used to endorse or promote products derived from this software without
 * specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
define(['ext', 'iweb/CoreModule','nics/modules/UserProfileModule'],
         function(Ext, Core, UserProfile){
	
	return Ext.define('modules.administration.UserController', {
		extend : 'Ext.app.ViewController',

		alias: 'controller.usercontroller',

		init: function(){
			this.mediator = Core.Mediator.getInstance();

			Core.EventManager.addListener(UserProfile.PROFILE_LOADED, this.load.bind(this));
			
			this.getView().getFirstGrid().getView().on('drop', this.enableUsers, this);
			this.getView().getSecondGrid().getView().on('drop', this.disableUsers, this);
		},
		
		load: function(evt){
			//populate the workspace dropdown
			this.loadWorkspaces();
			
			//Load Users
			this.loadUsers();
		},
		
		loadWorkspaces: function(){
			var topic = Core.Util.generateUUID();
			Core.EventManager.createCallbackHandler(topic, this, 
					function(evt, response){
						if(response.workspaces){
							var data = [];
							for(var i=0; i<response.workspaces.length;i++){
								data.push(response.workspaces[i]);
							}
							this.getView().getWorkspaceDropdown().getStore().loadData(data);
						}
						this.getView().setWorkspaceDropdown(
								UserProfile.getWorkspaceId());
					}
			);
			
			var url = Ext.String.format('{0}/workspace/system/{1}',
					Core.Config.getProperty(UserProfile.REST_ENDPOINT),
					location.hostname);
			this.mediator.sendRequestMessage(url, topic);
		},
		
		loadUsers: function(){
			this.getView().clearGrids();
			
			this.loadUserData(this.getView().getFirstGrid(), 'enabled');
			this.loadUserData(this.getView().getSecondGrid(), 'disabled');
		},
		
		loadUserData: function(grid, type){
			var topic = Core.Util.generateUUID();
			
			//populate the user grids
			Core.EventManager.createCallbackHandler(topic, this, 
					function(evt, response){
						if(response.data){
							var data = [];
							for(var i=0; i<response.data.length;i++){
								data.push(response.data[i]);
							}
							grid.getStore().loadData(data);
						}
					}
			);
			
			var url = Ext.String.format('{0}/users/{1}/{2}/{3}', 
					Core.Config.getProperty(UserProfile.REST_ENDPOINT), 
					UserProfile.getWorkspaceId(), type, UserProfile.getOrgId());
			
			this.mediator.sendRequestMessage(url, topic);
		},
		
		setWorkspaceId: function(combo, record, eOpts){
			this.workspaceId = record.data.workspaceid;
			this.loadUsers();
		},
		
		enableUsers: function(node, data, dropRec, dropPosition){
			this.setUserEnabled(node, data, dropRec, dropPosition, "enable");
		},
		
		disableUsers: function(node, data, dropRec, dropPosition){
			this.setUserEnabled(node, data, dropRec, dropPosition, "disable");
		},
		
		setUserEnabled: function(node, data, dropRec, dropPosition, type){
			for(var i=0;i<data.records.length;i++){
				var record = data.records[i];
				
				var topic = Core.Util.generateUUID();
				
				var userorgworkspaceid = record.data.userorg_workspace_id;
				var userid = record.data.userid;
				
				var _this = this;
				///populate the user grids
				Core.EventManager.createCallbackHandler(topic, this, 
						function(username, evt, response){
							if(!response.users || response.users.length != 1){ //we are enabling one at a time atm..
								Ext.MessageBox.alert("NICS", "There was an issue enabling the user.");
							}else{
								//This will enable the user again even if they 
								//are already enabled
								_this.updateOpenAM(username, type, userorgworkspaceid);
							}
						},
						[record.data.username]
				);
				
				var enabled = (type == "enable" ? "true" : "false");
				var url = Ext.String.format('{0}/users/{1}/enable/{2}/userid/{3}?enabled={4}', 
						Core.Config.getProperty(UserProfile.REST_ENDPOINT),
						UserProfile.getWorkspaceId(), userorgworkspaceid, userid,  enabled);
				
				this.mediator.sendPostMessage(url, topic, {});
			}
		},
		
		updateOpenAM: function(username, enabled, userorgworkspaceid){
			var topic  = Core.Util.generateUUID();
			//populate the user grids
			Core.EventManager.createCallbackHandler(topic, this, 
					function(evt, response){
						if(response.message && response.message != "Success"){
							Ext.MessageBox.alert("NICS", "There was an error setting user " + username + "'s account to " + enabled);
						}
					}
			);
			
			var url = Ext.String.format('{0}/sso/users/{1}/{2}/{3}', 
					Core.Config.getProperty(UserProfile.REST_ENDPOINT), 
					enabled, username, userorgworkspaceid);
			
			this.mediator.sendPostMessage(url, topic, {});
		}
	});
});