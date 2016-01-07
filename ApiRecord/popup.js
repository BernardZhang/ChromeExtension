// this port is available as soon as popup is opened
var popupPort = chrome.runtime.connect({name: 'POPUPCHANNEL'});
var renderList = function (requests) {
    var lists = requests.map(function (item) {
        return '<li data-id="' + item.requestId + '""><span>' + item.method + '</span><span title="' +  item.url + '">' + item.url + '</span><span class="send-btn">Send</span><span class="close-icon">X</span></li>';
    }).join('');
    $('#requests-list').html(lists);
};

setReportInputs();
setCaptureFilter();


// long-lived connection to the background channel 
chrome.runtime.onConnect.addListener(function(port){
  console.assert(port.name === 'BACKGROUNDCHANNEL');
  console.log("Connected to background");

  port.onMessage.addListener(function(data) {
    console.log("Received message from popup", data);
    var type = $('#request-type-tabs li.selected').data('type'),
        keyword = $('.filter-input').val(),
        method = $('#method-type-select').val();

    renderList(getRequestsByFilter(type, keyword, method)); //data.msg

    // localStorage.setItem("Received message from popup", JSON.stringify(msg));
  });

});

chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
    console.log(sender.tab ?
                "from a content script:" + sender.tab.url :
                "from the extension");
    if (request.greeting == "hello")
      sendResponse({farewell: "goodbye"});
    else
      sendResponse({}); // snub them.
});

$('#clear-list').on('click', function () {
  renderList([]);
  popupPort.postMessage({
    action: 'clearRequests'
  });
});

$('#requests-list').on('click', 'li', selectRequestItem);

$('#detail-view .close-icon').on('click', toggleDetailView);

$('#request-type-tabs li').on('click', filterRequestsByType);

$('.filter-input').on('keyup', filterRequestsByKeywords);

$('.detail-view-tabs li').on('click', switchDetailViewTab);

$('.list-view').on('click', 'li .close-icon', deleteRequestAction);

$('.list-view').on('click', '.send-btn', sendRequestAction);

$('#report-domain').on('change', changeReportDomain);

$('#report-app').on('change', changeApp);

$('#report-userName').on('change', changeUserName);

$('#method-type-select').on('change', changeHttpMethod);

$('input#onlyCaptureXHR').on('change', toggleCaptureXHR);

function changeHttpMethod(e) {
    var method = $(e.currentTarget).val(),
        type = $('#request-type-tabs li.selected').data('type'),
        keywords = $('.filter-input').val();

    renderList(getRequestsByFilter(type, keywords, method));
}

function setReportInputs() {
    $('#report-domain').val(localStorage.getItem('reportDomain') || 'http://');
    $('#report-app').val(localStorage.getItem('reportApp') || '');
    $('#report-userName').val(localStorage.getItem('reportUserName') || '');
}

function setCaptureFilter() {
    var onlyCaptureXHR = !!localStorage.getItem('onlyCaptureXHR');

    $('input#onlyCaptureXHR')[onlyCaptureXHR ? 'attr' : 'removeAttr']('checked');
    $('#request-type-tabs').toggle(!onlyCaptureXHR);

    popupPort.postMessage({
        action: 'filterChange',
        filter: onlyCaptureXHR ? 'xmlhttprequest' : 'all'
    });
}

function setReportDomain(domain) {
    domain = domain || localStorage.getItem('reportDomain') || '';
    localStorage.setItem('reportDomain', domain);
    $('#report-domain').val(domain);
}

function getReportDomain() {
    return $('#report-domain').val();
}

function changeReportDomain(e) {
    setReportDomain($(e.currentTarget).val());
}

function changeApp(e) {
    var target = $(e.currentTarget),
        val = target.val();

    localStorage.setItem('reportApp', val);
}

function changeUserName(e) {
    var target = $(e.currentTarget),
        val = target.val();

    localStorage.setItem('reportUserName', val);
}

// function sendRequestAction(e) {
//     var target = $(e.currentTarget),
//         li = target.closest('li'),
//         requestId = li.data('id'),
//         request = getRequestById(requestId),
//         sendHost = getReportDomain(),
//         domainReg = /https{0,1}:\/\/[^\/]+(\/.*)*/gi,
//         newUrl = request.url.replace(domainReg, sendHost + '$1');

//     if (!domainReg.test(sendHost)) {
//         alert('请输入正确的域名,格式如: http://baidu.com');
//         return false;
//     }

//     $[request.method.toLowerCase()](newUrl).complete(function (response) {
//         var responseText = response.responseText;

//         try {
//             $('#response').html('<pre>' + JSON.stringify(JSON.parse(responseText), null, 4) + '</pre>');
//         } catch (e) {
//             $('#response').html(responseText);
//         }
//     });

//     e.stopPropagation();
// }

function sendRequestAction(e) {
    var target = $(e.currentTarget),
        li = target.closest('li'),
        requestId = li.data('id'),
        request = getRequestById(requestId),
        sendHost = getReportDomain(),
        domainReg = /(?:https{0,1}:\/\/)([^\/]+)(\/.*)*/i,
        newUrl = request.url.replace(domainReg, sendHost + '$1'),
        matched = domainReg.exec(request.url);

    if (!sendHost/*!domainReg.test(sendHost)*/) {
        alert('请输入服务地址');
        return false;
    }

    $.ajax({
        type: 'POST',
        url: 'http://' + sendHost + '/OpenApi/addApi?fromApiRecord=true',
        contentType: 'application/json;charset=UTF-8',
        data: JSON.stringify({
            app: $('#report-app').val(),
            userName: $('#report-userName').val(),
            general: {
                method: request.method,
                requestUrl: request.url,
                remoteAddress: matched[1],
                host: matched[1].split(':')[0],
                port: matched[1].split(':')[1] || 80,
                path: matched[2].split('?')[0],
                query: matched[2].split('?')[1] || ''
            },
            requestHeaders: request.requestHeaders,
            requestBody: request.requestBody && request.requestBodyType ? (request.requestBody[request.requestBodyType] || '') :'',
            requestBodyType: request.requestBodyType
        }),
        success: function (response) {
          if (!response.status) {
              alert(response.info || '上报失败');
          } else {
            // TODO 上报成功处理
          }
        },
        error: function (error) {
            alert('上报失败\nstatus: ' + error.status + ', ' + error.statusText);
        }
    });/*.complete(function (response) {
        var responseText = response.responseText;

        try {
            $('#response').html('<pre>' + JSON.stringify(JSON.parse(responseText), null, 4) + '</pre>');
        } catch (e) {
            $('#response').html(responseText);
        }
    });*/

    e.stopPropagation();
}

function deleteRequestAction(e) {
    var target = $(e.currentTarget),
        li = target.closest('li'),
        requestId = li.data('id');

    popupPort.postMessage({
        action: 'deleteRequest',
        requestId: requestId
    });

    e.stopPropagation();
}

function switchDetailViewTab(e) {
    var target = $(e.currentTarget),
        id = target.data('href');

    $(id).siblings().hide();
    $(id).show();
    target.siblings().removeClass('selected');
    target.addClass('selected');
}

function selectRequestItem(e) {
    var target = $(e.currentTarget);
    var request = getRequestById(target.data('id'));

    renderRequestHeader(request);
    renderResponse(request);
    toggleDetailView(true);
}

function renderRequestHeader(request) {
    var requestHeaders = request.requestHeaders || [],
        responseHeaders = request.responseHeaders || [],
        requestBody = request.requestBody ? request.requestBody[request.requestBodyType] : '',
        generateHeaderDetails = function (summary, headers) {
            var content = '<ul>';
            
            headers.forEach(function (item) {
                content += '<li><span>' + item.name + ':</span><span>' + item.value + '</span></li>';
            });

            content += '</ul>';

            return [
                '<details open>',
                '  <summary>' + summary + '</summary>',
                content,
                '</details>'
            ].join('');
        },
        generateRequestBody = function (request) {
            var content = '',
                requestBody = request.requestBody,
                requestBodyData = {},
                key = '';

            if (requestBody) {
                requestBodyData = requestBody[request.requestBodyType];

                if (request.requestBodyType === 'formData') {
                    for (key in requestBodyData) {
                        content += key + ':' + JSON.stringify(requestBodyData[key]) + '\n';
                    }
                } else {
                    try {
                        content = JSON.stringify(JSON.parse(requestBodyData), null, 4);
                    } catch (e) {
                        content = requestBodyData;
                    }
                }

                return '<details open><summary>Reqeust Body</summary><pre>' + content + '</pre></details>';
            }

            return '';
        },
        generalHtml = generateHeaderDetails('General', [
            { name: 'Remote Address', value: request.ip },
            { name: 'Request URL', value: request.url },
            { name: 'Request Method', value: request.method },
            { name: 'Status Code', value: request.statusCode }
        ]),
        requestHeaderssHtml = generateHeaderDetails('Reqeust Headers ( ' + requestHeaders.length + ')', requestHeaders),
        responseHeadersHtml = generateHeaderDetails('Response Headers ( ' + responseHeaders.length + ')', responseHeaders),
        requestBody = generateRequestBody(request);


    $('#header').empty().append(generalHtml).append(requestHeaderssHtml).append(responseHeadersHtml).append(requestBody);
}

function renderResponse(request) {
    var method = request.method.toLowerCase(),
        url = request.url,
        option = {},
        key = '';

    if (['main_frame', 'sub_frame'].indexOf(request.type) !== -1) {
        $('#response').html('<iframe src="' + request.url +'"></iframe>');
    } else if (request.type === 'image') {
        $('#response').html('<img src="' + request.url + '">');
    } else {
        option = {
            method: method,
            url: request.url + (request.url.indexOf('?') > -1 ?  '&' : '?') + 'fromApiRecord=true'
        };

        if (request.requestBodyType) {
            if (request.requestBodyType === 'rawData') {
                option.contentType = 'application/json;charset=UTF-8';  
            } else {
                // option.contentType = 'application/x-www-form-urlencoded; charset=UTF-8';
            }

            if (request.requestBody) {
                if (request.requestBodyType === 'rawData') {
                    option.data = request.requestBody[request.requestBodyType] || '';
                } else {
                    option.data = {};
                    //  formdata 处理
                    for (key in request.requestBody[request.requestBodyType]) {
                        if (/\[\]$/.test(key)) {  // name[]这种形式
                            option.data[key.substr(0, key.length - 2)] = request.requestBody[request.requestBodyType][key];
                        } else {
                            option.data[key] = request.requestBody[request.requestBodyType][key][0];
                        }
                    }
                }
                
            }
        }
        $.ajax(option).complete(function (response) {
            var responseText = response.responseText;

            try {
                $('#response').html('<pre>' + JSON.stringify(JSON.parse(responseText), null, 4) + '</pre>');
            } catch (e) {
                $('#response').html(responseText);
            }
        });
        // $[method](url, method === 'get' ? { fromApiRecord: true } : request.requestBody).complete(function (response) {
        //     var responseText = response.responseText;

        //     try {
        //         $('#response').html('<pre>' + JSON.stringify(JSON.parse(responseText), null, 4) + '</pre>');
        //     } catch (e) {
        //         $('#response').html(responseText);
        //     }
        // });
    }
}

function filterRequestsByKeywords(e) {
  var val = $(e.currentTarget).val(),
      type = $('#request-type-tabs li.selected').data('type'),
      method = $('#method-type-select').val(),
      requests = getRequestsByFilter(type, val, method);

  console.log(requests);
  renderList(requests);    
} 

function filterRequestsByType(e) {
  var target = $(e.currentTarget),
      type = target.data('type'),
      keyword = $('.filter-input').val(),
      method = $('#method-type-select').val(),
      requests = getRequestsByFilter(type, keyword, method);

  target.siblings('li').removeClass('selected');
  target.addClass('selected');

  renderList(requests);
  console.log(requests);
  var obj = {};
  requests.forEach(function (item) {
    obj[item.type] = true;
  });

  console.log(Object.keys(obj));
}

function getRequests() {
    return JSON.parse(localStorage.getItem('requests'));
    // return JSON.parse(sessionStorage.getItem('requests'));
}

// types: ["other", "image", "xmlhttprequest", "script", "stylesheet", "main_frame", "sub_frame"]
function getRequestsByFilter(type, keyword, method) {
    var requests = getRequests();

    if (localStorage.getItem('onlyCaptureXHR')) {
        type = 'all';
    }

    type = type ? type : 'all';
    type = type === 'doc' ? ['main_frame', 'sub_frame'] : type;
    method = method || '';

    if (type === 'all' && !keyword && !method) {
        return requests
    }

    return requests.filter(function (item) {
        var typeMatch = type instanceof Array ? type.indexOf(item.type) > -1 : (item.type === type || type === 'all'),
            keywordMatch = keyword ? new RegExp(keyword, 'gi').test(item.url) : true,
            methodMatch = method ? new RegExp(method, 'gi').test(item.method) : true;

        return typeMatch && keywordMatch && methodMatch;
    });
}

// types: ["other", "image", "xmlhttprequest", "script", "stylesheet", "main_frame", "sub_frame"]
function getRequestsByType(type, keyword, method) {
  var requests = getRequests();

  type = type ? type : 'all';
  type = type === 'doc' ? ['main_frame', 'sub_frame'] : type;
  method = method || '';

  if (type === 'all' && !keyword && !method) {
      return requests
  }

  return requests.filter(function (item) {
      var typeMatch = type instanceof Array ? type.indexOf(item.type) > -1 : (item.type === type || type === 'all'),
          keywordMatch = keyword ? new RegExp(keyword, 'gi').test(item.url) : true,
          methodMatch = method ? new RegExp(method, 'gi').test(item.method) : true;

      return typeMatch && keywordMatch && methodMatch;
  });
}

function getRequestsByKeywords(keyword) {
  var requests = getRequestsByType();

  if (keyword) {
    return requests.filter(function (item) {
      return new RegExp(keyword, 'gi').test(item.url);
    });
  }

  return requests;
}

function getRequestById(id) {
  return getRequestsByType().filter(function (item) {
    return item.requestId == id;
  })[0];
}



function toggleDetailView(visible) {
    $('#detail-view').toggle(visible);
}

function toggleCaptureXHR(e) {
    var isChecked = $(e.currentTarget).is(':checked');

    $('#request-type-tabs').toggle(!isChecked);

    popupPort.postMessage({
        action: 'changeFilter',
        filter: isChecked ? 'xmlhttprequest' : 'all'
    });
}
