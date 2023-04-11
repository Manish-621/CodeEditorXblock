function CodeEditorXBlock(element,runtime){
/* Javascript for CodeEditorXBlock. */
        // Retrieve Elements
        var saveHandlerUrl=runtime.handlerUrl(element,'save_or_update_snippet_code');
        var getHandlerUrl=runtime.handlerUrl(element,'get_snippet_code');
        
        
        let Code_Editor = new function(){
            const ACE_URL1 = "https://cdnjs.cloudflare.com/ajax/libs/ace/1.4.11/ace.js",
                ACE_URL2 = "https://cdnjs.cloudflare.com/ajax/libs/ace/1.4.11/ext-language_tools.min.js";
            const LanguageTypes = {
                'BACKEND': $('#backend',element).val(),
                'DATABASE': $('#database',element).val(),
                'DEVOPS': $('#devops',element).val(),
                'FRONTEND': $('#frontend',element).val()
            }

            let _Loader = {

                $loading : $('.loader').show(),
                $CodeeditorDiv : $('.assessment-sec').hide(),

                _show : function(){
                    _Loader.$loading.show();
                    _Loader.$CodeeditorDiv.hide();
                },
                _hide : function(){
                    _Loader.$loading.hide();
                    _Loader.$CodeeditorDiv.show();
                }
            }

            let _Editor_Activity = {
                editor : null,
                last_Selected_Language:0, current_Selected_Language:0,
                _setUpDevOpsLangs : function(){
                    let DevopsLanguageModes= ["https://cdnjs.cloudflare.com/ajax/libs/ace/1.4.12/mode-groovy.min.js","https://cdnjs.cloudflare.com/ajax/libs/ace/1.4.12/mode-yaml.min.js",
                                            "https://cdnjs.cloudflare.com/ajax/libs/ace/1.4.12/mode-powershell.min.js","https://cdnjs.cloudflare.com/ajax/libs/ace/1.4.12/mode-sh.min.js"]

                    DevopsLanguageModes.forEach((url)=> {
                        jQuery.loadScript = function (url, callback) {
                            jQuery.ajax({
                                url: url,
                                dataType: 'script',
                                success: callback,
                                async: true
                            });
                        }
                    })
                },

                _set_Editor : function(){
                    let questionlist=[];
                    $('#themeChange',element).val('monokai');
                    _Editor_Activity.editor.setTheme("ace/theme/"+'monokai');
                    _Editor_Activity.editor.setOptions({
                        fontSize: "14px",
                        enableBasicAutocompletion: true,
                        enableSnippets: true,
                        enableLiveAutocompletion: true
                    });
                    $('.output-terminal',element).html("<div>Output Window<div>");
                },

                _update_Settings : function(codeArray,lang_type){
                    _Editor_Activity.last_Selected_Language=0;
                    _Editor_Activity.current_Selected_Language=0;

                    // Re-configiure code editor
                    _Editor_Activity.editor.setShowPrintMargin(false);
                    _Editor_Activity.editor.session.setMode("ace/mode/"+codeArray[0].syntaxhighlightName);
                    _Editor_Activity.editor.setValue(codeArray[0].default_code);
                    _Editor_Activity.editor.renderer.setScrollMargin(10, 10);

                    // Applying code run configurations
                    $('.code_run_ele',element).hide();
                    $run_elements = $('.code_run_ele.run_'+lang_type.toLowerCase(),element)
                        if($run_elements.length > 0){
                            $run_elements.show();
                        }
                        else{
                            $('.code_run_ele.run_default',element).show();
                        }
                },

                _init : function(){
                    _Editor_Activity.editor = ace.edit("editor");
                    _Editor_Activity._set_Editor();
                    $('#themeChange',element).on('change', function() {
                        _Editor_Activity.editor.setTheme("ace/theme/"+this.value);
                    });

                    $('#languageTypeChange',element).on('change', function(){
                        _Editor_Ops._changeEditor(this.value);
                    });
                    $('#languageTypeChange',element).trigger('change');

                    $('#languageChange',element).on('change', function() {
                        var code = _Editor_Activity.editor.getValue();
                        _Editor_Activity.last_Selected_Language=_Editor_Activity.current_Selected_Language;
                        codeArray[_Editor_Activity.last_Selected_Language].default_code=code;
                        _Editor_Activity.editor.setValue(codeArray[this.value].default_code);
                        _Editor_Activity.editor.session.setMode("ace/mode/"+codeArray[this.value].syntaxhighlightName);
                        _Editor_Activity.current_Selected_Language=this.value;
                    });
                    $('#fontChange',element).on('change', function() {
                        _Editor_Activity.editor.setOptions({
                            fontSize: this.value.toString()+'px',
                            enableBasicAutocompletion: true,
                            enableSnippets: true,
                            enableLiveAutocompletion: true
                        });
                    });
                }

            };

            let _Editor_Ops = {

                _saveCode : function(isUpdate = false,url){
                    let $button = $('#saveBtn',element),
                    $requestMsg = $('#savingMsg',element),
                    $responseMsg = $('#savedMsg',element)
                    if(isUpdate){
                        if($('.snippet_id',element).val().length == 0){
                            notification_manager.display_Notification('Please Enter a Snippet ID to update');
                            throw new Error("No Snippet ID to update");
                        }
                        $button = $('#updateBtn',element);
                        $requestMsg = $('#submittingMsg',element);
                        $responseMsg = $('#submittedMsg',element);
                    }

                    $('#saveBtn',element).prop('disabled', true);
                    $('#updateBtn',element).prop('disabled', true);
                    $requestMsg.css('display','inline');
                    $.post(url, {
                        language : codeArray[$("#languageChange :selected",element).val()].language,
                        filename : codeArray[$("#languageChange :selected",element).val()].filename,
                        content : _Editor_Activity.editor.getValue(),
                        snippet_id : $('.snippet_id',element).val(),
                        is_Update : isUpdate
                    },
                    function(data, status) {
                        if(status == "success"){
                            $('#snippetid',element).text(data['snippet_id']);
                            $responseMsg.css('display','inline');
                            $requestMsg.css('display','none');
                            setTimeout(() => {
                                $responseMsg.css('display','none');
                            }, 3000);
                            $('#saveBtn',element).prop('disabled', false);
                            $('#updateBtn',element).prop('disabled', false);
                        }
                    }).fail(function() {
                        $('.output-terminal',element).html("<div>Got unexpected response<div>");
                        $('#saveBtn',element).prop('disabled', false);
                        $('#updateBtn',element).prop('disabled', false);
                        $requestMsg.css('display','none');
                    });

                },

                _runCode : function(){
                    $(this).prop('disabled', true);
                    $('.output-terminal',element).empty();
                    $('.output-terminal',element).html("<div>Running.....<div>")
                    var str = $('.code-footer input',element)[0].value;
                    var input= str.replace(",", "\n");
                    $.post("/run_snippet", {
                        name: codeArray[$("#languageChange :selected",element).val()].filename,
                        content: _Editor_Activity.editor.getValue(),
                        language: codeArray[$("#languageChange :selected",element).val()].language,
                        stdin:input,
                        allow_main : true
                    },
                    function(data, status) {
                        $('#runBtn',element).prop('disabled', false);
                        var jsonRes=data;
                        if(!data) {
                            $('.output-terminal',element).html("<div>Got unexpected response<div>")
                        }
                        else if(jsonRes.ExamType=="DATABASE") {
                            if(!jsonRes.stderr){
                                try{
                                    $('.output-terminal',element).html('<table class="result_table" style="white-space:nowrap;">'+data.stdout+'</table>');
                                }
                                catch(e){
                                    $('.output-terminal',element).html(data.stdout);
                                }
                            }
                            else
                                $('.output-terminal',element).html("<div>"+jsonRes.stderr+"<div>")
                            }

                        else{
                            if(!jsonRes.stderr)
                                $('.output-terminal',element).html("<div>"+jsonRes.stdout+"<div>")
                            else
                                $('.output-terminal',element).html("<div>"+jsonRes.stderr+"<div>")
                        }
                    }).fail(function() {
                        $('#runBtn',element).prop('disabled', false);
                        $('.output-terminal',element).html("<div>Got unexpected response<div>");
                    });
                },

                _previewCode : function(){
                    var doc = $('#result-Window',element)[0].contentWindow.document;
                    doc.open();
                    doc.write(_Editor_Activity.editor.getValue());
                    doc.close();
                    $('body',element).css('overflow','hidden');
                    $('.outline_element',element).show();
                },

                _changeEditor : function(languageType, selected_language = null, code = null){
                    _Loader._show();
                    let coding_Languages = LanguageTypes[languageType];
                    $("#languageChange option",element).each(function(){
                        this.remove();
                    });
                    $('.code-footer input',element).val('');
                    $('.output-terminal',element).html('');
                    if(selected_language && selected_language.length>0){
                        let  index = coding_Languages.map(function(e) { return e.language; }).indexOf(selected_language);
                        if (index != 0 || index != null ){
                            [coding_Languages[index], coding_Languages[0]] = [coding_Languages[0], coding_Languages[index]];
                        }
                        if(code && code.length>0){
                            coding_Languages[0].default_code = code;
                        }
                    }
                    coding_Languages.forEach((language , i)=>{
                            $("#languageChange",element).append($('<option></option>').val(i).html(language['displayname']));
                        });

                    codeArray=coding_Languages;
                    _Editor_Activity._update_Settings(codeArray, languageType);
                    _Loader._hide();
                },

                _getSnippet : function(url){
                    if($('.snippet_id',element).val().length == 0){
                        notification_manager.display_Notification('Please Enter a Snippet ID to fetch code');
                        throw new Error("No Snippet ID to fetch code");
                    }
                    let snippet_id = $('.snippet_id',element).val();
                    $.get(url+snippet_id, function(data,status){
                        if(status == "success"){
                            console.log(data);
                            $('#snippetid',element).text(snippet_id);
                            let languageType = '';
                            if(['c', 'cpp', 'java', 'python', 'php', 'javascript'].includes(data['language'])){
                                $('#languageTypeChange',element).val('BACKEND');
                                languageType = 'BACKEND';
                            }
                            else if(['mssql', 'mysql', 'oracle'].includes(data['language'])){
                                $('#languageTypeChange',element).val('DATABASE');
                                languageType = 'DATABASE';
                            }
                            else if(['html', 'javascript', 'css'].includes(data['language'])){
                                $('#languageTypeChange',element).val('FRONTEND');
                                languageType = 'FRONTEND';
                            }
                            else{
                                $('#languageTypeChange',element).val('DEVOPS');
                                languageType = 'DEVOPS';
                            }
                            $('#languageTypeChange',element).trigger('change');
                            _Editor_Ops._changeEditor(languageType, data['language'], data['code']);
                        }
                    });
                },

                _init : function(){
                    $("#runBtn",element).click(function(){
                        _Editor_Ops._runCode();
                    });
                    $("#previewBtn",element).click(function(){
                        _Editor_Ops._previewCode();
                    });

                    $('#getBtn',element).click(function(){
                        _Editor_Ops._getSnippet(getHandlerUrl);
                    });

                    $('#close-preview',element).click(function(){
                        $('.outline_element',element).hide();
                        if($('.fullscreenFrame',element).length == 0){
                            $('body',element).css('overflow','visible');
                        }
                    });
                    $("#saveBtn",element).click(function(){
                        _Editor_Ops._saveCode(isUpdate=false,saveHandlerUrl);
                    });

                    $("#toggleHint",element).click(function(){
                        let label = 'Hide';
                        if($('.devops_hint',element).toggle().css('display') == "none")
                            label = 'Show';
                        $(this).text(label+' Hint');
                    });

                    $("#toggleAnswer",element).click(function(){
                        let label = 'Hide';
                        if($('.devops_answer',element).toggle().css('display') == "none")
                            label = 'Show';
                        $(this).text(label+' Answer');
                    });

                    $("#toggleTerminal",element).click(function(){
                        $('.code-testcase',element).toggle(5, ()=>_Editor_Activity.editor.resize());
                        $('#hide-show-icon',element).toggleClass('fa-angle-up');
                        $('#hide-show-icon',element).toggleClass('fa-angle-down');
                    })

                    $("#updateBtn",element).click(function(){
                        let message='Are you sure you want to update ?';
                        let option2=new Notification_Modal_Option(optionTitle='No',functionDelegate= null);
                        let option1=new Notification_Modal_Option(optionTitle='Yes',functionDelegate= function(hideModal = null){
                                _Editor_Ops._saveCode(isUpdate=true);
                                if(hideModal != null) hideModal(false);
                            });
                        notification_manager.display_Decision(message,1,true,option1,option2,'OptionDialog');
                    });

                    $('.top-nav-coding',element).on('click','li.activate_links',function(e)
                    {
                        _Editor_Ops.clicked_Question = this;
                        _Editor_Ops._saveAndContinue(_Editor_Ops._fetchNextQuestion);

                    });
                }
            };

            init : {
                $.getScript(ACE_URL1 , function() {
                    $.getScript(ACE_URL2, function() {
                        _Editor_Activity._init();
                        _Editor_Ops._init();
                    });
                });
            }

            return {
                warnIfUnsaved : _Editor_Ops._saveAndContinue
            }
        }
    }     