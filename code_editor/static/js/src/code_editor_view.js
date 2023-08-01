function CodeEditorViewXBlock(runtime, element,){


    var handlerUrl = runtime.handlerUrl(element, 'studio_submit');

    $('.save-button', element).click(function(){
        submit(handlerUrl,element);
    });
   
    let submit= function(url){
        var data = {
            // 'question': document.querySelector('.question').val(),
            'question': $('.question').val(),
            'max_attempts': document.querySelector(".max-attempts").value,
            'has_score': document.querySelector(".has_score").checked,
            'enable_autocomplete': document.querySelector('.enable_autocomplete').checked,
            'maximum_score': document.querySelector('.max_score').value,
            // 'evaluation_parameters': document.querySelector('#e-parameters').val(),
            'evaluation_parameters': $('#e-parameters').val(), 
            'language_type': document.querySelector('.language-type').value
        };

        runtime.notify('save', {state: 'start', message: gettext("Saving")});
        $.post(url, JSON.stringify(data), 'json').done(function(response) {
            if (response.result === 'success') {
                runtime.notify('save', {state: 'end'});
            } else {
                var message = response.messages.join(", ");
                     runtime.notify('error', {
                    'title': gettext("There was an error with your form."),
                    'message': message
                });
            }
        });
    }

    $('.cancel-button').on('click', function() {
        runtime.notify('cancel', {});
    });
}
