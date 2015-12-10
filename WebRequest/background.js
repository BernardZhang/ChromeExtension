var backgroundPort;
var poupPort = false;
var tabId = 0;
var store = {
	getRequests: function () {
		var requests = localStorage.getItem('requests');

		if (requests) {
			requests = JSON.parse(requests);
		} else {
		    requests = [];
		    localStorage.setItem('requests', JSON.stringify(requests));
		}

		return requests;
	},
	setRequests: function (requests) {
		localStorage.setItem('requests', JSON.stringify(requests));
	},  
	addRequest: function (request) {
		var requests = this.getRequests();
		requests.unshift(request);
		localStorage.setItem('requests', JSON.stringify(requests));
	},
	removeReqeust: function () {

	},
	clearRequests: function () {
		localStorage.removeItem('requests');
	}
};

// 监听扩展连接事件
chrome.runtime.onConnect.addListener(function (port) {
	console.log('connect port name:' + port.name);
	backgroundPort = chrome.runtime.connect({name: 'BACKGROUNDCHANNEL'});
	poupPort = true;

	port.onMessage.addListener(function (msg) {
		console.log('message from' + port.name, msg);
		if (msg.action == 'clearRequests') {
			store.clearRequests();
			backgroundPort.postMessage({
				msg: store.getRequests()
			});
		}
	});

	backgroundPort.postMessage({
		name: 'background',
		msg: store.getRequests()
	});
});

// event listener called when postman sends a request (in the form of a message)
chrome.runtime.onMessageExternal.addListener(onExternalMessage);

// 监听请求发出前事件
chrome.webRequest.onBeforeRequest.addListener(onBeforeRequest, {
	urls: ['<all_urls>']
}, [ 'blocking' ]);

chrome.tabs.getSelected(null, function(tab) {
	tabId = tab.id;
	chrome.tabs.sendRequest(tab.id, {
		greeting: 'hello'
	}, function (response) {
		// console.log(response.farewell);
		console.log(response);
	});
});

// responds to a message from postman - adds the XHR from postman to queue
function onExternalMessage(request, sender, sendResponse) {
	console.log('onExternalMessage');
}

function onBeforeRequest(request) {
	console.log('onBeforeRequest', request);
	if (poupPort) {
		store.addRequest(request);
		backgroundPort.postMessage({
			msg: store.getRequests()
		});	
	}

	// chrome.tabs.sendRequest(tabId, {greeting: "hello"}, function(response) {
	//     console.log(response);
	// });
}