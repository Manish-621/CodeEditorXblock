"""TO-DO: Write a description of what this XBlock is."""

import pkg_resources
from web_fragments.fragment import Fragment
from django.contrib.auth.decorators import login_required
from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt
from xblock.core import XBlock
from xblock.fields import Boolean, Dict, Float, Integer, Scope, String
from .utils import get_code_by_snippet, save_or_update_code, run_backend_code, run_sql_query, run_backend_tests    
from .enums import CodingLanguagesType
from django.http import JsonResponse
import uuid
from django.conf import settings
from .languages_list import _languages
import requests
import random
import json
import base64
import uuid
import urllib
import ast
import sys
import os 
from xblockutils.resources import ResourceLoader
from xblockutils.studio_editable import StudioEditableXBlockMixin


loader = ResourceLoader(__name__)  # pylint: disable=invalid-name

@XBlock.wants('settings')
class CodeEditorXBlock(StudioEditableXBlockMixin,XBlock):
    """
    TO-DO: document what your XBlock does.
    """

    # Fields are defined on the class.  You can access them in your code as
    # self.<fieldname>.

    # TO-DO: delete count, and define your own fields.
    question_id = Integer(
        default=0,
        scope=Scope.settings,
        help="Assign a queston id",
        enforce_type=True,
    )
    default_snippet_id= String(
        default="",
        scope=Scope.settings,
        help="Enter the snippet Id",
        enforce_type=True,
    )
    result_snippet_id= String(
        default="",
        scope=Scope.settings,
        help="Enter the snippet Id",
        enforce_type=True,
    )
    question = String(
        display_name=("Coding Question"),
        default='Write a program to print Hello World', 
        scope=Scope.settings,
        help="Enter the coding question",
        enforce_type=True,
    )
    language_type=String(
        display_name=("Problem Area"),
        help="Backend/Frontend/Database/Docker",
        scope=Scope.settings,
        values=[
               { "display_name":"Backend", "value":"BACKEND" },
               { "display_name":"Frontend", "value":"FRONTEND" },
               { "display_name":"Database", "value":"DATABASE" },
               { "display_name":"Devops", "value":"DEVOPS" },
               ],
        enforce_type= True,
    )
    max_score=Integer(
        display_name=("Max Score"),
        help=("Defines the maximum score for the question"),
        scope=Scope.settings,
        default=1,
        enforce_type=True,
    )
    has_score=Boolean(
        display_name=("Has Score"),
        help=("Defines if the problem is graded"),
        scope=Scope.settings,
        default=True,
        enforce_type=True,
    )
    allow_main=Boolean(
        display_name=("Graded"),
        help=("Defines if the problem is graded"),
        scope=Scope.settings,
        default=True,
        enforce_type=True,
    )
    enable_autocomplete=Boolean(
        display_name=("Enable auto-complete"),
        help=("Enable Auto-complete"),
        scope=Scope.settings,
        default=False,
        enforce_type=True,
    )
    coding_Languages=String(
        display_name=("Coding Language"),
        help=("Choose the language to code"),
        scope=Scope.user_state,
        default="C",
        enforce_type= True,
    )
    evaluation_parameters=String(
        scope=Scope.settings,
        display_name=("Evaluation Parameters"),
        help=("Enter the test cases for auto-evaluation"),
    )
    content=String(
        help=("code input by student"),
        scope=Scope.user_state,
    )
    max_attempts=Integer(
        scope=Scope.settings,
        default=1,
        display_name=("Max Attempts"),
        help=("The number of attempts the student can make"),
    )
    snippet_id = String(
        scope=Scope.user_state,
    )
    snippet_url = String(
        scope=Scope.user_state,
    )
    snippet_text = String(
        scope=Scope.user_state,
    )
    snippet_language = String(
        scope=Scope.user_state,
    )
    score = String(
        scope=Scope.user_state,
    )
    result = String(
        scope=Scope.user_state,
    )
    evaluation_details = String(
        scope=Scope.user_state,
    )
    remarks = String(
        scope=Scope.user_state,
    )
    is_submit = Boolean(
        scope=Scope.user_state,
        default= False
    )
    snippet_id_deflt = String(
      default=uuid.uuid4,
      scope=Scope.user_state,
    )
    snippet_name_deflt = String(
      default="",
      scope=Scope.user_state,
    )
    snippet_text_deflt = String(
      default="",
      scope=Scope.user_state,
    )
    coding_language_deflt = String(
      default="",
      scope=Scope.user_state,
    )
    coding_Languages_deflt = String(
      default="",
      scope=Scope.user_state,
      values= [(tag.name, tag.value) for tag in CodingLanguagesType],
    )

    
    def request_save(self, question_id):
        results = self.objects.filter(question_id=question_id,is_submit=True)
        if results.exists():
            raise ('Response already submitted. Cannot Alter.')
        return False

    
    def save_result(self, question_id, snippet_id, is_submit, content, language):
        results = self.objects.filter(question_id=question_id)
        if results.exists():
            result = results.first()
            if result.is_submit:
                raise ('Response already submitted. Cannot Alter.')
            result.snippet_id = snippet_id
            result.snippet_text = content
            result.snippet_language = language
            result.snippet_url = "https://glot.io/api"+'/snippets/'+str(snippet_id)
            result.is_submit = is_submit
            result.save()
            return True

        result = cls()
        result.question_id = question_id
        result.snippet_id = snippet_id
        result.snippet_url = "https://glot.io/api"+'/snippets/'+str(snippet_id)
        result.has_score = False
        result.is_submit = is_submit
        result.save()
        return True

    def save_exam_score(self, question_id, score , evaluvation_par, remarks):
        results = self.objects.filter(question_id=question_id)
        if results.exists():
            result = results.first()
            result.score =  score
            #result.evaluation_details=  evaluvation_par;
            result.remarks= remarks
            result.is_graded =  True
            result.save()
            return True

        return False

    def get_attempts_count(self,question_id):
        return len(self.objects.filter(question_id=question_id)) 

    def get_snippet(self, snippet_id):
        snippets = self.objects.filter(snippet_id=snippet_id_deflt)
        if snippets.exists():
            return snippets.first()           

    def resource_string(self, path):
        """Handy helper for getting resources from our kit."""
        data = pkg_resources.resource_string(__name__, path)
        return data.decode("utf8")

    # TO-DO: change this view to display your data your own way.
    def student_view(self, context=None):
        """
        The primary view of the CodeEditorXBlock, shown to students
        when viewing courses.
        """
        backend = json.dumps(_languages.BACKEND)
        database = json.dumps(_languages.DATABASE)
        devops = json.dumps(_languages.DEVOPS)
        frontend = json.dumps(_languages.FRONTEND)
        context = {
            'BACKEND':backend,
            'DATABASE':database,
            'DEVOPS':devops,
            'FRONTEND':frontend
        }
        cont= {
            'fields':self.fields,
            'self':self,
        }
        js_urls = [
            'static/js/vendor/virtual-dom-1.3.0.min.js',
            'static/js/src/code_editor.js',
        ]
        html = loader.render_django_template("./static/html/code_editor.html",cont)
        frag = Fragment(html)
        css = loader.render_django_template('static/css/code_editor.css')
        frag.add_css(css)
        for js_url in js_urls:
            frag.add_javascript(loader.load_unicode(js_url))
        frag.initialize_js('CodeEditorXBlock',context)
        return frag

    # TO-DO: change this handler to perform your own actions.  You may need more
    # than one handler, or you may not need any handlers at all.

    def studio_view(self, context):
        """
        Editing view in Studio
        """
        #js_templates = loader.load_unicode('/static/html/js_templates.html')
        # Get an 'id_suffix' string that is unique for this block.
        # We append it to HTML element ID attributes to ensure multiple instances of the DnDv2 block
        # on the same page don't share the same ID value.
        # We avoid using ID attributes in preference to classes, but sometimes we still need IDs to
        # connect 'for' and 'aria-describedby' attributes to the associated elements.
        # id_suffix = self._get_block_id()
        # js_templates = js_templates.replace('{{id_suffix}}', id_suffix)
        css_urls = (
            'static/css/code_editor_view.css',
        )
        context.update({
            'fields': self.fields,
            'self': self,
            'urls': css_urls
        })
        fragment = Fragment()
        fragment.add_content(loader.render_django_template('/static/html/code_editor_view.html',context))
        #fragment.add_content(loader.render_django_template('/static/html/code_editor_view.html',context=context))
        css = loader.render_django_template('static/css/code_editor_view.css')
        js_urls = [
             'static/js/vendor/handlebars-v1.1.2.js',
             'static/js/src/code_editor_view.js',
        ]
        #     'public/js/code_editor_view.js',
        fragment.add_css(css)
        # for css_url in css_urls:
        #     fragment.add_css_url(self.runtime.local_resource_url(self, css_url))
        for js_url in js_urls:
             fragment.add_javascript(loader.load_unicode(js_url))

        # Do a bit of manipulation so we get the appearance of a list of zone options on
        # items that still have just a single zone stored

        # items = self.data.get('items', [])

        # for item in items:
        #     zones = self.get_item_zones(item['id'])
        #     # Note that we appear to be mutating the state of the XBlock here, but because
        #     # the change won't be committed, we're actually just affecting the data that
        #     # we're going to send to the client, not what's saved in the backing store.
        #     item['zones'] = zones
        #     item.pop('zone', None)

        fragment.initialize_js('CodeEditorViewXBlock')
        return fragment

    @XBlock.json_handler
    def studio_submit(self, submissions, suffix=''):
        """
        Handles studio save.
        """
        self.question = submissions['question']
        self.language_type = submissions['language_type']
        self.max_attempts = submissions['max_attempts']
        # if (showanswer := submissions['showanswer']) != self.showanswer:
        #     self.showanswer = showanswer
        # if showanswer == SHOWANSWER.DEFAULT:
        #     del self.showanswer
        self.has_score = submissions['has_score']
        self.max_score = int(submissions['max_score'])
        self.enable_autocomplete = submissions['enable_autocomplete']
        self.evaluation_parameters = submissions['evaluation_parameters']
        s
        return {
            'result': 'success',
        }    

    @XBlock.json_handler
    def run_snippet(self,request,data,unused_suffix=''):
        name = request['name']
        content = request['content']
        stdin = request['stdin']
        language= request['language']
        result_Snippet = self.result_snippet_id
        allow_main = request['allow_main']
        if 'sql' in language :
            question_id=request.POST.get('question_id')
            resp1 = requests.get(self.additional_information, allow_redirects=True, verify=False)
            db_content = base64.b64encode(resp1.content)
            data = run_sql_query(content, db_content)

            if (data):
                data['stdout']= base64.b64decode(data['stdout']) if  data['stdout']  else None
                data['stderr']= base64.b64decode(data['stderr']) if  data['stderr']  else None
                data['ExamType']=CodingLanguagesType.DATABASE.value
                return data
        else :
            if result_Snippet:
                _,code = get_code_by_snippet(result_Snippet)
                content+= code
            elif str(allow_main) == 'false':
                for x in _languages.BACKEND :
                    if x['language'] == language :
                        content+=x['main_method']
                        break
            response_data = run_backend_code(name, content, stdin, language)
            if(response_data):
                return response_data
        return ""
        
    def get_grade(score, breakpoints=[60, 70, 80, 90], grades='FDCBA'):
        i = bisect(breakpoints, score)
        return grades[i]

    @XBlock.json_handler
    def save_snippet(self,request):
        #user = request.user
        language = request.POST.get('language')
        name = request.POST.get('name')
        content = request.POST.get('content')
        question_id = request.POST.get('question_id')
        snippet_id = request.POST.get('snippet_id')
        unit_id=request.POST.get('unit_id')
        is_submit =request.POST.get('is_Submit')

        # will throw exception if the response already submitted
        self.request_save(question_id)
        # snippet_id = save_or_update_code(language, user.username, name, content, snippet_id)

        if self.save_result(question_id, snippet_id, is_submit=='true', content, language):
            # Log for auto evaluation
            #import ipdb; ipdb.set_trace()
            try :
                if self.auto_evaluation and self.language_type == CodingLanguagesType.BACKEND.value:
                    coding_result_data = self.objects.filter( has_score=False).first()
                    request_data = {}
                    request_data['attempt_id'] = coding_result_data.id
                    request_data['snippet_id'] = coding_result_data.snippet_id
                    request_data['langType'] = 'be'
                    request_data['evaluation_parameters'] = coding_result_data.evaluvation_parameters
                    payload = json.dumps(request_data)
                    headers = {
                                'Content-Type': 'application/json'
                            }
                    response = requests.post(url = settings.AZURE_CLI_API_URL+'/api/v1/evaluation/add-job', data = payload, headers = headers)
            except :
                print(str(sys.exc_info()[1]))
            return {'success': True, 'snippet_id':snippet_id}
        return {'success': False}

    @login_required
    @XBlock.json_handler
    def get_code_by_questionID(self,request) :
        coding_question_id=self.question_id
        coding_question = self.objects.filter(question_id=coding_question_id).first()
        Coding_Result = self.objects.filter(question_id=coding_question_id).first()
        saved_language=None
        saved_snippetid=None
        data = {}
        is_submit=None
        editorLanguages=None
        filteredLanguage=None
        attempted_language='na'
        if Coding_Result:
            saved_snippet = Coding_Result.snippet_text
        else:
            saved_snippet = None

        if coding_question:
            data['is_coding'] = True
            language_list=""
            #Loading Language
            if coding_question.coding_Languages :
                # language_list=coding_question.coding_Languages.lower().split(',')
                language_list= [language.strip() for language in coding_question.coding_Languages.lower().split(',')]

            coding_languages_type =  coding_question.language_type
            if not coding_languages_type:
                coding_languages_type=CodingLanguagesType.BACKEND.value

            if coding_languages_type== CodingLanguagesType.BACKEND.value :
                editorLanguages=json.loads(json.dumps(_languages.BACKEND))
            elif coding_languages_type== CodingLanguagesType.DATABASE.value :
                editorLanguages=json.loads(json.dumps(_languages.DATABASE))
            elif coding_languages_type== CodingLanguagesType.DEVOPS.value :
                editorLanguages=json.loads(json.dumps(_languages.DEVOPS))
            elif coding_languages_type== CodingLanguagesType.FRONTEND.value :
                editorLanguages=json.loads(json.dumps(_languages.FRONTEND))

            if len(language_list)>0:
                filteredLanguages= [x for x in editorLanguages if x['tagname'].lower() in language_list]
            else :
                filteredLanguages= editorLanguages

            #Loading default snippet code
            default_snippetsID=None
            if coding_question.default_snippet_id:
                # default_snippetsID=coding_question.default_snippet_id.split(',')
                default_snippetsID = [snippet.strip() for snippet in self.default_snippet_id.split(',')]

            result_SnippetsIds = None
            if coding_question.result_snippet_id:
                # result_SnippetsIds = coding_question.result_snippet_id.split(',')
                result_SnippetsIds = [snippet.strip() for snippet in self.result_snippet_id.split(',')]

            resultSnippets = dict()
            if default_snippetsID:
                for index, default_snippet_id in enumerate(default_snippetsID) :
                    try:
                        default_snippet = self.get_snippet(default_snippet_id)
                        code = default_snippet.snippet_text_deflt
                        language = default_snippet.coding_language_deflt
                        if result_SnippetsIds:
                            resultSnippets[language] = result_SnippetsIds[index]
                        for x in filteredLanguages :
                            if x['language'] == language :
                                x['default_code'] = code
                                x['default_without_main'] = code
                    except:
                        raise

            #Loading saved snippet code
            if Coding_Result and Coding_Result.snippet_text:
                is_submit = Coding_Result.is_submit
                saved_snippetid= Coding_Result.snippet_id
                saved_snippet = Coding_Result.snippet_text
                if saved_snippetid :
                    try:
                        # language, code = get_code_by_snippet(saved_snippetid)
                        language = Coding_Result.snippet_language
                        code = saved_snippet
                        attempted_language=language
                        for x in filteredLanguages :
                            if x['language'] == language and code != "Not Attempted" :
                                x['default_code'] = code
                                x['default_without_main'] = code
                    except Exception:
                        code = filteredLanguages[0]['default_code']
                        if not coding_question.allow_main_method:
                            code = filteredLanguages[0]['default_without_main']
                        try:
                            snippet_id = save_or_update_code(filteredLanguages[0]['language'], user.username, filteredLanguages[0]['filename'], code, None)
                        except:
                            snippet_id = str(uuid.uuid4())
                        saved_snippetid=snippet_id
                        CodingResult.save_result(user, coding_question,'NA', snippet_id, unit_id, is_submit=='false', code, filteredLanguages[0]['language'])
            else :
                code = filteredLanguages[0]['default_code']
                if not coding_question.allow_main_method:
                    code = filteredLanguages[0]['default_without_main']
                try:
                    snippet_id = save_or_update_code(filteredLanguages[0]['language'], user.username, filteredLanguages[0]['filename'], code, None)
                except:
                    snippet_id = str(uuid.uuid4())
                saved_snippetid=snippet_id
                CodingResult.save_result(user, coding_question,'NA', snippet_id, unit_id, is_submit=='false', code, filteredLanguages[0]['language'])

            data['coding_Languages']=filteredLanguages
            data['snippetid'] = saved_snippetid
            data['is_submit']= is_submit
            data['attempted_language'] = attempted_language
            #data['enable_run'] = coding_question.enable_code_run
            #data['enable_copy_paste'] = coding_question.enable_copy_paste
            data['language_type'] = coding_question.language_type
            data['resultSnippets'] = resultSnippets
            data['allow_main'] = coding_question.allow_main_method
        else :
            data['is_coding'] = False
        return data


    # APIs for auto evaluation
    @csrf_exempt
    @XBlock.json_handler
    def get_pending_responses(self,request):
        course_id = request.GET['course_id']
        if course_id:
            course_id = course_id.replace('*','+')
            responses = self.objects.filter(has_score=False,is_submit=True)
        else :
            responses = self.objects.filter(has_score=False,is_submit=True)
        ids = []
        if responses.exists():
            ids = [response.id for response in responses]
        return json.dumps(ids)

    @csrf_exempt
    @XBlock.json_handler
    def get_student_response(self,request):
        responses = self.objects.filter(has_score=False,is_submit=True)
        response_data = {}
        if responses.exists():
            response = responses.first()
            response_data['attempt_id'] = response.id
            response_data['snippet_id'] = response.snippet_id
            response_data['langType'] = 'be'
            if response.coding_exam.coding_Languages_type == CodingLanguagesType.DATABASE.value :
                response_data['langType'] = 'db'
            response_data['evaluation_parameters'] = response.coding_exam.evaluvation_parameters
        return json.dumps(response_data)

    @csrf_exempt
    @XBlock.json_handler
    def update_coding_result(request):
        attempt_id = request.POST.get('attempt_id')
        evaluation_details = request.POST.get('evaluation_details')
        #import ipdb; ipdb.set_trace()
        responses = CodingResult.objects.filter(has_score=False,is_submit=True,pk=attempt_id)
        if responses.exists():
            response = responses.first()
            response.evaluation_details = evaluation_details
            response.score = json.loads(evaluation_details)['final_score']
            response.is_graded = 1
            response.save()

        return {'success':True}

    @login_required
    @XBlock.json_handler
    def get_snippet_code(self,request, snippet_id):
        data = {}
        #import ipdb; ipdb.set_trace()
        # data['language'], data['code'] = get_code_by_snippet(snippet_id)
        coding_results = self.objects.filter(snippet_id=snippet_id)
        if coding_results.exists:
            result = coding_results.first()
            data["language"] = result.snippet_language
            data["code"] = result.snippet_text

        return data

    @XBlock.json_handler
    def save_or_update_snippet_code(self,request,unused_suffix=''):
        """ 
        if not (request.user.is_superuser or request.user.is_staff):
        raise NotFoundError('Unauthorized Request')
        """
        language = request['language']
        filename = request['filename']
        content = request['content']
        snippet_id = request['snippet_id']
        is_update =request['is_Update']

        data = {}
        data['snippet_id'] = save_or_update_code(language,filename, content, snippet_id if is_update == 'true' else None)
        return data


    @XBlock.json_handler
    def increment_count(self, data, suffix=''):
        """
        An example handler, which increments the data.
        """
        # Just to show data coming in...
        assert data['hello'] == 'world'

        self.count += 1
        return {"count": self.count}

    # TO-DO: change this to create the scenarios you'd like to see in the
    # workbench while developing your XBlock.
    @staticmethod
    def workbench_scenarios():
        """A canned scenario for display in the workbench."""
        return [
            ("CodeEditorXBlock",
            """<code_editor/>"""),
        ]