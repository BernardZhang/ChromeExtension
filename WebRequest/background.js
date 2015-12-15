var backgroundPort;
var poupPort = false;
var tabId = 0;
var requestObj = {};
var store = {
	maxLength: 10000,
	getRequests: function () {
		var requests = localStorage.getItem('requests');

		if (requests) {
			requests = JSON.parse(requests);
		} else {
		    requests = [];
		    store.setRequests(requests);
		}

		return requests;
	},
	setRequests: function (requests) {
		try {
			localStorage.setItem('requests', JSON.stringify(requests.slice(0, Math.min(requests.length, store.maxLength))));
		} catch (e) {
			localStorage.setItem('requests', '');
			console.warn(e);
		}
	},  
	addRequest: function (request) {
		if (!/^chrome\-extension:\/\//gi.test(request.url)) {
			var requests = this.getRequests();
			requests.unshift(request);
			store.setRequests(requests);
		}
	},
	findRequestById: function (requestId, callback) {
		var requests = store.getRequests(),
		    request = null;

		for (var i = 0; i < requests.length; i++) {
			if (requests[i].requestId === requestId.toString()) {
				request = requests[i];
				break;
			}
		}

		if (request && callback && typeof callback === 'function') {
			callback(request, requests, i);
		} 

		return request;
	},
	extendRequest: function (eventType, extendReq) {
		extendReq[eventType + '_timeStamp'] = extendReq.timeStamp;
		delete extendReq.timeStamp;

		return store.findRequestById(extendReq.requestId, function (request, requests, index) {
			$.extend(request, extendReq);
			requests[index] = request;
			store.setRequests(requests);
		});
	},
	deleteRequest: function (requestId) {
		store.findRequestById(requestId, function (request, requests, index) {
			requests.splice(index, 1);
			store.setRequests(requests);
		});
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
		switch (msg.action) {
		case 'clearRequests':
			store.clearRequests();
			break;
		case 'deleteRequest': 
			store.deleteRequest(msg.requestId);
			break;
		}

		backgroundPort.postMessage({
			msg: store.getRequests()
		});
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
}, [ 'blocking', 'requestBody' ]);

chrome.webRequest.onBeforeSendHeaders.addListener(onBeforeSendHeaders, {
	urls: ['<all_urls>']
}, [ 'requestHeaders', 'blocking' ]);

chrome.webRequest.onSendHeaders.addListener(onSendHeaders, {
	urls: ['<all_urls>']
}, [ 'requestHeaders' ]);

chrome.webRequest.onHeadersReceived.addListener(onHeadersReceived, {
	urls: ['<all_urls>']
}, [ 'blocking', 'responseHeaders' ]);

chrome.webRequest.onAuthRequired.addListener(onAuthRequired, {
	urls: ['<all_urls>']
}, [ 'responseHeaders', 'blocking'/*, 'asyncBlocking'*/ ]);

chrome.webRequest.onBeforeRedirect.addListener(onBeforeRedirect, {
	urls: ['<all_urls>']
}, [ 'responseHeaders' ]);

chrome.webRequest.onResponseStarted.addListener(onResponseStarted, {
	urls: ['<all_urls>']
}, [ 'responseHeaders' ]);

chrome.webRequest.onCompleted.addListener(onCompleted, {
	urls: ['<all_urls>']
}, [ 'responseHeaders' ]);

chrome.webRequest.onErrorOccurred.addListener(onErrorOccurred, {
	urls: ['<all_urls>']
});

chrome.tabs.getSelected(null, function(tab) {
	tabId = tab.id;
	chrome.tabs.sendRequest(tab.id, {
		greeting: 'hello'
	}, function (response) {
		// console.log(response.farewell);
		console.log(response);
	});
});

chrome.browserAction.onClicked.addListener(function(){
    window.open(chrome.extension.getURL("popup.html"), "fiddler_option_page");
});

// responds to a message from postman - adds the XHR from postman to queue
function onExternalMessage(request, sender, sendResponse) {
	console.log('onExternalMessage');
}

function onBeforeRequest(request) {
	console.log('1 onBeforeRequest', request);
	if (poupPort) {
		store.addRequest(request);
		backgroundPort.postMessage({
			msg: store.getRequests()
		});	
	}

	return { cancel: false };

	// chrome.tabs.sendRequest(tabId, {greeting: "hello"}, function(response) {
	//     console.log(response);
	// });
}

function onBeforeSendHeaders(request) {
	console.log('2 onBeforeSendHeaders', request);
	store.extendRequest('onBeforeSendHeaders', request);
	delete request.requestHeaders['User-Agent'];
    return {requestHeaders: request.requestHeaders};
}

function onSendHeaders(request) {
	store.extendRequest('onSendHeaders', request);
	console.log('3 onSendHeaders', request);
}

function onHeadersReceived(request) {
	store.extendRequest('onHeadersReceived', request);
	console.log('4 onHeadersReceived', request);
}

function onAuthRequired(request) {
	store.extendRequest('onAuthRequired', request);
	console.log('5 onAuthRequired', request);
}

function onBeforeRedirect(request) {
	store.extendRequest('onBeforeRedirect', request);
	console.log('6 onBeforeRedirect', request);
}

function onResponseStarted(request) {
	if (request) {
		store.extendRequest('onResponseStarted', request);
		console.log('7 onResponseStarted', request);
	}	
}
	

function onCompleted(request) {
	if (request) {
		store.extendRequest('onCompleted', request);
		console.log('8 onCompleted', request);
	}
}

function onErrorOccurred(request) {
	if (request) {
		store.extendRequest('onErrorOccurred', request);
		console.log('9 onErrorOccurred', request);
	}
}






