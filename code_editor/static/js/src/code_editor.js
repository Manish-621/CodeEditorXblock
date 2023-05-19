function CodeEditorXBlock(runtime, element, init_args){
/* Javascript for CodeEditorXBlock. */
        // Retrieve Elements
        var saveHandlerUrl= runtime.handlerUrl(element,'save_or_update_snippet_code');
        var getHandlerUrl=runtime.handlerUrl(element,'get_snippet_code');
        var getCodeUrl=runtime.handlerUrl(element,'get_code_by_questionID');
        var runCodeUrl=runtime.handlerUrl(element,'run_snippet');

        $('.unit-iframe-wrapper').css({
            width : $(window).width()
        })
        $('#toggle_fullscreen').on('click', function(){
            // if already full screen; exit
            // else go fullscreen
            // if (document.fullscreenElement) {
            //   //document.exitFullscreen();
            // } else {
              //$('.unit-iframe-wrapper').get(0).requestFullscreen();
              $('.editor-wrapper').get(0).requestFullscreen();
            // }
        });

        // $(document).ready(function() {
        //     $('.toggle-switch input[type="checkbox"]').change(function() {
        //       $(this).siblings('.dropdown-menu').toggle();
        //       console.log($('#themeChange').val())
        //     });
        //   });
        
        let Code_Editor = new function(){
            const ACE_URL1 = "https://cdnjs.cloudflare.com/ajax/libs/ace/1.16.0/ace.js",
                ACE_URL2 = "https://cdnjs.cloudflare.com/ajax/libs/ace/1.16.0/ext-language_tools.min.js";
            const LanguageTypes = {
                'BACKEND': JSON.parse(init_args.BACKEND),
                'DATABASE':  JSON.parse(init_args.DATABASE),
                'DEVOPS':  JSON.parse(init_args.DEVOPS),
                'FRONTEND':  JSON.parse(init_args.FRONTEND)
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
                    let DevopsLanguageModes= ["https://cdnjs.cloudflare.com/ajax/libs/ace/1.16.0/mode-groovy.min.js","https://cdnjs.cloudflare.com/ajax/libs/ace/1.16.0/mode-yaml.min.js",
                                            "https://cdnjs.cloudflare.com/ajax/libs/ace/1.16.0/mode-powershell.min.js","https://cdnjs.cloudflare.com/ajax/libs/ace/1.16.0/mode-sh.min.js"]

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
                    $('#themeChange' ).val('monokai');
                    _Editor_Activity.editor.setTheme("ace/theme/"+'monokai');
                    _Editor_Activity.editor.setOptions({
                        fontSize: "14px",
                        enableBasicAutocompletion: true,
                        enableSnippets: true,
                        enableLiveAutocompletion: true
                    });
                    $('.output-terminal' ).html("<div>Output Window<div>");
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
                    $('.code_run_ele' ).hide();
                    $run_elements = $('.code_run_ele.run_'+lang_type.toLowerCase() )
                        if($run_elements.length > 0){
                            $run_elements.show();
                        }
                        else{
                            $('.code_run_ele.run_default' ).show();
                        }
                },

                _init : function(){
                    _Editor_Activity.editor = ace.edit("editor");
                    _Editor_Activity._set_Editor();
                    $('#toggle-checkbox' ).on('change', function() {
                        this.value=(this.value=='monokai'|| this.value=='on' )?'sqlserver':'monokai';
                        _Editor_Activity.editor.setTheme("ace/theme/"+this.value);
                        var col=(this.value=='monokai')?'rgb(39, 38, 38)':'#CECECB';
                        var colopp=(this.value=='monokai')?'#fff':'#101111';
                        $(".code-editor-con").css({
                            background: col, 
                        })
                        $(".form-group label").css({
                            color:colopp
                        })
                        $(".editorLable").css({
                            background: col,
                            color: colopp
                        })
                        $(".output-terminal").css({
                            background: col,
                            color: colopp
                        })

                       
                        
                    });

                    $('#languageTypeChange' ).on('change', function(){
                        _Editor_Ops._changeEditor(this.value);
                    });
                    $('#languageTypeChange' ).trigger('change');

                    $('#languageChange' ).on('change', function() {
                        var code = _Editor_Activity.editor.getValue();
                        _Editor_Activity.last_Selected_Language=_Editor_Activity.current_Selected_Language;
                        codeArray[_Editor_Activity.last_Selected_Language].default_code=code;
                        _Editor_Activity.editor.setValue(codeArray[this.value].default_code);
                        _Editor_Activity.editor.session.setMode("ace/mode/javascript");
                        _Editor_Activity.current_Selected_Language=this.value;
                    });
                    $('#fontChange' ).on('change', function() {
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
                    let $button = $('#saveBtn' ),
                    $requestMsg = $('#savingMsg' ),
                    $responseMsg = $('#savedMsg' )
                    if(isUpdate){
                        if($('.snippet_id' ).val().length == 0){
                            notification_manager.display_Notification('Please Enter a Snippet ID to update');
                            throw new Error("No Snippet ID to update");
                        }
                        $button = $('#updateBtn' );
                        $requestMsg = $('#submittingMsg' );
                        $responseMsg = $('#submittedMsg' );
                    }

                    $('#saveBtn' ).prop('disabled', true);
                    $('#updateBtn' ).prop('disabled', true);
                    $requestMsg.css('display','inline');
                    let pstdata={
                        language : codeArray[$("#languageChange :selected" ).val()].language,
                        filename : codeArray[$("#languageChange :selected" ).val()].filename,
                        content : _Editor_Activity.editor.getValue(),
                        snippet_id : $('.snippet_id' ).val(),
                        is_Update : isUpdate
                    }
                    $.ajax({
                        type: "POST",
                        url: url,
                        data: JSON.stringify(pstdata),
                        success: function(data, status) {
                            if(status == "success"){
                                $('#snippetid' ).text(data['snippet_id']);
                                $responseMsg.css('display','inline');
                                $requestMsg.css('display','none');
                                setTimeout(() => {
                                    $responseMsg.css('display','none');
                                }, 3000);
                                $('#saveBtn' ).prop('disabled', false);
                                $('#updateBtn' ).prop('disabled', false);
                            }
                            },
                        error: function() {
                            $('.output-terminal' ).html("<div>Got unexpected response<div>");
                            $('#saveBtn' ).prop('disabled', false);
                            $('#updateBtn' ).prop('disabled', false);
                            $requestMsg.css('display','none');
                        }
                    });

                },

                _runCode : function(url){
                    $(this).prop('disabled', true);
                    $('.output-terminal' ).empty();
                    $('.output-terminal' ).html("<div>Running.....<div>")
                    var str = $('.code-footer input' )[0].value;
                    var input= str.replace(",", "\n");
                    let pstdata = {
                        name: codeArray[$("#languageChange :selected" ).val()].filename,
                        content: _Editor_Activity.editor.getValue(),
                        language: codeArray[$("#languageChange :selected" ).val()].language,
                        stdin:input,
                        allow_main : true
                    }
                    $.ajax({
                        type: "POST",
                        url: url,
                        data: JSON.stringify(pstdata),
                        success: function(data, status) {

                                    $('#runBtn' ).prop('disabled', false);
                                    var jsonRes=data;
                                    if(!data) {
                                        $('.output-terminal' ).html("<div>Got unexpected response<div>")
                                    }
                                    else if(jsonRes.ExamType=="DATABASE") {
                                        if(!jsonRes.stderr){
                                            try{
                                                $('.output-terminal' ).html('<table class="result_table" style="white-space:nowrap;">'+data.stdout+'</table>');
                                            }
                                            catch(e){
                                                $('.output-terminal' ).html(data.stdout);
                                            }
                                        }
                                        else
                                            $('.output-terminal' ).html("<div>"+jsonRes.stderr+"<div>")
                                        }

                                    else{
                                        if(!jsonRes.stderr)
                                            $('.output-terminal' ).html("<div>"+jsonRes.stdout+"<div>")
                                        else
                                            $('.output-terminal' ).html("<div>"+jsonRes.stderr+"<div>")
                                    }
                                },
                         error: function() {
                                    $('#runBtn' ).prop('disabled', false);
                                    $('.output-terminal' ).html("<div>Got unexpected response<div>");
                                },
                    });
                },

                _previewCode : function(){
                    var doc = $('#result-Window' )[0].contentWindow.document;
                    doc.open();
                    doc.write(_Editor_Activity.editor.getValue());
                    doc.close();
                    $('body' ).css('overflow','hidden');
                    $('.outline_element' ).show();
                },

                _changeEditor : function(languageType, selected_language = null, code = null){
                    _Loader._show();
                    
                    let coding_Languages = LanguageTypes[languageType];
                    $('.code-footer input' ).val('');
                    $('.output-terminal' ).html('');
                    if(selected_language && selected_language.length>0){
                        let  index = coding_Languages.map(function(e) { return e.language; }).indexOf(selected_language);
                        if (index != 0 || index != null ){
                            [coding_Languages[index], coding_Languages[0]] = [coding_Languages[0], coding_Languages[index]];
                        }
                        if(code && code.length>0){
                            coding_Languages[0].default_code = code;
                        }
                    }
                    
                           for( var language in coding_Languages){
                            $("#languageChange" ).append($('<option></option>').val(language).html(coding_Languages[language].displayname));
                           }

                    codeArray=coding_Languages;
                    _Editor_Activity._update_Settings(codeArray, languageType);
                    _Loader._hide();
                },

                _getSnippet : function(url){
                    if($('.snippet_id' ).val().length == 0){
                        notification_manager.display_Notification('Please Enter a Snippet ID to fetch code');
                        throw new Error("No Snippet ID to fetch code");
                    }
                    let snippet_id = $('.snippet_id' ).val();
                    $.get(url+snippet_id, function(data,status){
                        if(status == "success"){
                            $('#snippetid' ).text(snippet_id);
                            let languageType = '';
                            if(['c', 'cpp', 'java', 'python', 'php', 'javascript'].includes(data['language'])){
                                $('#languageTypeChange' ).val('BACKEND');
                                languageType = 'BACKEND';
                            }
                            else if(['mssql', 'mysql', 'oracle'].includes(data['language'])){
                                $('#languageTypeChange' ).val('DATABASE');
                                languageType = 'DATABASE';
                            }
                            else if(['html', 'javascript', 'css'].includes(data['language'])){
                                $('#languageTypeChange' ).val('FRONTEND');
                                languageType = 'FRONTEND';
                            }
                            else{
                                $('#languageTypeChange' ).val('DEVOPS');
                                languageType = 'DEVOPS';
                            }
                            $('#languageTypeChange' ).trigger('change');
                            _Editor_Ops._changeEditor(languageType, data['language'], data['code']);
                        }
                    });
                },

                _init : function(){
                    $("#runBtn" ).click(function(){
                        _Editor_Ops._runCode(runCodeUrl);
                    });
                    $("#previewBtn" ).click(function(){
                        _Editor_Ops._previewCode();
                    });

                    $('#getBtn' ).click(function(){
                        _Editor_Ops._getSnippet(getHandlerUrl);
                    });

                    $('#close-preview' ).click(function(){
                        $('.outline_element' ).hide();
                        if($('.fullscreenFrame' ).length == 0){
                            $('body' ).css('overflow','visible');
                        }
                    });
                    $("#saveBtn" ).click(function(){
                        _Editor_Ops._saveCode(isUpdate=false,saveHandlerUrl);
                    });

                    $("#toggleHint" ).click(function(){
                        let label = 'Hide';
                        if($('.devops_hint' ).toggle().css('display') == "none")
                            label = 'Show';
                        $(this).text(label+' Hint');
                    });

                    $("#toggleAnswer" ).click(function(){
                        let label = 'Hide';
                        if($('.devops_answer' ).toggle().css('display') == "none")
                            label = 'Show';
                        $(this).text(label+' Answer');
                    });

                    $("#toggleTerminal" ).click(function(){
                        $('.code-testcase' ).toggle(5, ()=>_Editor_Activity.editor.resize());
                        $('#hide-show-icon' ).toggleClass('fa-angle-up');
                        $('#hide-show-icon' ).toggleClass('fa-angle-down');
                    })

                    $("#updateBtn" ).click(function(){
                        let message='Are you sure you want to update ?';
                        let option2=new Notification_Modal_Option(optionTitle='No',functionDelegate= null);
                        let option1=new Notification_Modal_Option(optionTitle='Yes',functionDelegate= function(hideModal = null){
                                _Editor_Ops._saveCode(isUpdate=true);
                                if(hideModal != null) hideModal(false);
                            });
                        notification_manager.display_Decision(message,1,true,option1,option2,'OptionDialog');
                    });

                    $('.top-nav-coding' ).on('click','li.activate_links',function(e)
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