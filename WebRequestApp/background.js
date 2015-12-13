chrome.app.runtime.onLaunched.addListener(function () {
    chrome.app.window.create('index.html');
});

var backgroundPort;
var poupPort = false;
var tabId = 0;
var requestObj = {};
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
		if (!/^chrome\-extension:\/\//gi.test(request.url)) {
			var requests = this.getRequests();
			requests.unshift(request);
			localStorage.setItem('requests', JSON.stringify(requests));	
		}
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

	return { cancel: false };

	// chrome.tabs.sendRequest(tabId, {greeting: "hello"}, function(response) {
	//     console.log(response);
	// });
}

function onBeforeSendHeaders(request) {
	console.log('onBeforeSendHeaders', request);
	delete request.requestHeaders['User-Agent'];
    return {requestHeaders: request.requestHeaders};
}

function onSendHeaders(request) {
	console.log('onSendHeaders', request);
}

function onHeadersReceived(request) {
	console.log('onHeadersReceived', request);
}

function onAuthRequired(request) {
	console.log('onAuthRequired', request);
}

function onBeforeRedirect(request) {
	console.log('onBeforeRedirect', request);
}

function onResponseStarted(request) {
	console.log('onResponseStarted', request);
}

function onCompleted(request) {
	console.log('onCompleted', request);
}

function onErrorOccurred(request) {
	console.log('onErrorOccurred', request);
}

chrome.browserAction.onClicked.addListener(function(){
    var url = chrome.extension.getURL("popup.html");
    console.log("++++++++++" + url);
    window.open(url, "fiddler_option_page");
});
// 
// chrome.experimental.debugger.onEvent.addListener(function (param) {
// 	console.log('=====================');
// 	console.log(param);
// });


// chrome.devtools.network.onRequestFinished.addListener(function (param) {
// 	console.log('=====================');
// 	console.log(param);
// });



