var backgroundPort;
var poupPort = false;
var tabId = 0;
var requestObj = {};
var store = {
	maxLength: 100,
	getRequests: function () {
		var requests = localStorage.getItem('requests');
		// var requests = sessionStorage.getItem('requests');

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
			// sessionStorage.setItem('requests', JSON.stringify(requests.slice(0, Math.min(requests.length, store.maxLength))));
		} catch (e) {
			localStorage.setItem('requests', '');
			// sessionStorage.setItem('requests', '');
			console.warn(e);
		}
	},  
	addRequest: function (request) {

		// chrome插件本身的文件请求过滤掉
		if (/^chrome\-extension:\/\//gi.test(request.url)) {
			return false;
		}

		// 点击捕获的请求，获取response时，不重复记录请求
		if (request.url.indexOf('fromApiRecord=true') > -1) {
			return false;
		}

		if (localStorage.getItem('onlyCaptureXHR') && store.checkRequestType(request) || !localStorage.getItem('onlyCaptureXHR')) {
			var requests = this.getRequests();
			requests.unshift(request);
			store.setRequests(requests);
		}
	},
	checkRequestType: function (request) {
		if (/^chrome\-extension:\/\//gi.test(request.url)) {
			return false;
		}

		if (request.type !== 'xmlhttprequest') {
			return false
		}

		if (/\.(html|js|css|png|img|gif|pdf)$/.test(request.url.split('?')[0])) {
			return false;
		}

		return true;
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
		// sessionStorage.removeItem('requests');
	},
	filterByType: function (filterType) {
		var requests = store.getRequests();

		switch (filterType) {
		case 'xmlhttprequest':
			requests = requests.filter(function (request) {
				return store.checkRequestType(request);
			});
			localStorage.setItem('onlyCaptureXHR', true);
			break;
		case 'all':
			localStorage.setItem('onlyCaptureXHR', '');
			break;
		default:
			localStorage.setItem('onlyCaptureXHR', '');
			break;
		}

		store.setRequests(requests);

	}
};

// 初始化过滤参数为 capture xhr only
localStorage.setItem('onlyCaptureXHR', true);


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
		case 'changeFilter':
			store.filterByType(msg.filter);
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
		if (isMethodWithBody(request.method)) {
			getRequestBodyRawDta(request);
		}
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



function isMethodWithBody(method) {
    var methodsWithBody = ["POST", "PUT", "PATCH", "DELETE", "LINK", "UNLINK", "LOCK", "PROPFIND"];
    method = method.toUpperCase();
    return methodsWithBody.indexOf(method)!==-1;
}

function getRequestBodyRawDta(request) {
	var methodWithBody = isMethodWithBody(request.method);
	var requestBodyType;
	var rawEncodedData;

	if (methodWithBody && request.requestBody) {
		requestBodyType = request.requestBody.formData ? 'formData' : 'rawData';
		request.requestBodyType = requestBodyType;

		// encode raw data if exists
		if (requestBodyType === "rawData") {
		    if(request.requestBody.raw && request.requestBody.raw[0]) {
		        var rawEncodedData = getDataFromArrayBuffer(request.requestBody.raw[0].bytes);
		        request.requestBody["rawData"] = rawEncodedData;
		        // delete request.requestBody["raw"] // strip out existing raw requestBody
		    } 
		    else {
		        // if no raw data or bytes set rawData as null
		        request.requestBody["rawData"] = null; 
		    }
		}
	}
}

// sends the captured request to postman with id as reqId (using the requestCache)
// then clears the cache
function sendCapturedRequestToPostman(reqId){
  var loggerMsg = "<span class=\"" + addClassForRequest(requestCache[reqId].method) + "\">" + requestCache[reqId].method + "</span><span>" + (requestCache[reqId].url).substring(0, 150) + "</span>";

  var request = requestCache[reqId];
  var methodWithBody = isMethodWithBody(request.method);
  var requestBodyType;
  var rawEncodedData;

  if (methodWithBody && request.requestBody) {
    requestBodyType = _.has(request.requestBody, 'formData') ? 'formData' : 'rawData';
    request.requestBodyType = requestBodyType;

    // encode raw data if exists
    if (requestBodyType === "rawData") {
        if(request.requestBody.raw && request.requestBody.raw[0]) {
            var rawEncodedData = getBase64FromArrayBuffer(request.requestBody.raw[0].bytes);
            request.requestBody["rawData"] = rawEncodedData;
            delete request.requestBody["raw"] // strip out existing raw requestBody
        } 
        else {
            // if no raw data or bytes set rawData as null
            request.requestBody["rawData"] = null; 
        }
    }
  }

  // chrome.runtime.sendMessage(
  //     postmanAppId,
  //     {
  //       "postmanMessage": {
  //         "reqId": reqId,
  //         "request": requestCache[reqId],
  //         "type": postmanMessageTypes.capturedRequest
  //       }
  //     },
  //     function response(resp) {
  //         console.log("Request sent to postman for request:", reqId);
  //         sendCapturedRequestToFrontend(loggerMsg);
  //         delete requestCache[reqId];
  //     }
  // );
}


function getDataFromArrayBuffer(responseData) {
    var uInt8Array = new Uint8Array(responseData);
    var i = uInt8Array.length;
    var binaryString = new Array();
    while (i--)
    {
      binaryString[i] = String.fromCharCode(uInt8Array[i]);
    }
    var data = binaryString.join('');
    var base64 = window.btoa(data);

    return binaryString.join('');
}

// var base64DecodeChars = new Array(
//      -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
//      -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
//      -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 62, -1, -1, -1, 63,
//      52, 53, 54, 55, 56, 57, 58, 59, 60, 61, -1, -1, -1, -1, -1, -1,
//      -1,  0,  1,  2,  3,  4,  5,  6,  7,  8,  9, 10, 11, 12, 13, 14,
//      15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, -1, -1, -1, -1, -1,
//     -1, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40,
//     41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, -1, -1, -1, -1, -1);

//  //解码的方法
// function base64decode(str) {
//     var c1, c2, c3, c4;
//     var i, len, out;
//     len = str.length;
//     i = 0;
//     out = "";

//     while(i < len) {
    
// 	    do {
// 	        c1 = base64DecodeChars[str.charCodeAt(i++) & 0xff];
// 	    } while(i < len && c1 == -1);

// 	    if(c1 == -1)
// 	        break;
	    
// 	    do {
// 	        c2 = base64DecodeChars[str.charCodeAt(i++) & 0xff];
// 	    } while(i < len && c2 == -1);

// 	    if(c2 == -1)
// 	        break;
// 	    out += String.fromCharCode((c1 << 2) | ((c2 & 0x30) >> 4));
	    
// 	    do {
// 	        c3 = str.charCodeAt(i++) & 0xff;
// 	        if(c3 == 61)
// 	        return out;
// 	        c3 = base64DecodeChars[c3];
// 	    } while(i < len && c3 == -1);

// 	    if(c3 == -1)
// 	        break;
// 	    out += String.fromCharCode(((c2 & 0XF) << 4) | ((c3 & 0x3C) >> 2));
	    
// 	    do {
// 	        c4 = str.charCodeAt(i++) & 0xff;
// 	        if(c4 == 61)
// 	        return out;
// 	        c4 = base64DecodeChars[c4];
// 	    } while(i < len && c4 == -1);

// 	    if(c4 == -1)
// 	        break;
// 	    out += String.fromCharCode(((c3 & 0x03) << 6) | c4);
//     }
//     return out;
// }






