function CodeEditorViewXBlock(runtime, element){


    var handlerUrl = runtime.handlerUrl(element, 'studio_submit');

    $('.save-button', element).click(function(){
        console.log(document.querySelector('.has_score').checked)
        submit(handlerUrl,element);
    });
   
    let submit= function(url){
        var data = {
            'question': document.querySelector('.question').innerHTML,
            'max_attempts': document.querySelector(".max-attempts").value,
            'has_score': document.querySelector(".has_score").checked,
            'enable_autocomplete': document.querySelector('.enable_autocomplete').checked,
            'max_score': document.querySelector('.max_score').value,
            'evaluation_parameters': document.querySelector('.eval-parameters').innerHTML,
            'language_type': document.querySelector('.language-type').value
        };

        runtime.notify('save', {state: 'start', message: "Saving"});
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
}
