from django.shortcuts import render, get_object_or_404, redirect
from django.views.generic import ListView, DetailView
from .models import Survey, Response, Answer, Choice
from .forms import SurveyResponseForm

class SurveyListView(ListView):
    model = Survey
    template_name = 'surveys/survey_list.html'
    context_object_name = 'surveys'
    
    def get_queryset(self):
        return Survey.objects.filter(is_active=True)

def survey_detail(request, pk):
    survey = get_object_or_404(Survey, pk=pk, is_active=True)
    
    if request.method == 'POST':
        form = SurveyResponseForm(request.POST, survey=survey)
        if form.is_valid():
            response = Response.objects.create(
                survey=survey,
                respondent_email=form.cleaned_data.get('respondent_email')
            )
            
            for question in survey.questions.all():
                field_name = f'question_{question.id}'
                answer_value = form.cleaned_data.get(field_name)
                
                answer = Answer.objects.create(
                    response=response,
                    question=question
                )
                
                if question.question_type == 'text':
                    answer.text_answer = answer_value
                elif question.question_type == 'choice':
                    answer.choice_answer = Choice.objects.get(id=answer_value)
                elif question.question_type == 'rating':
                    answer.rating_answer = int(answer_value)
                
                answer.save()
            
            return redirect('survey_complete', pk=survey.pk)
    else:
        form = SurveyResponseForm(survey=survey)
    
    return render(request, 'surveys/survey_detail.html', {
        'survey': survey,
        'form': form
    })

def survey_complete(request, pk):
    survey = get_object_or_404(Survey, pk=pk)
    return render(request, 'surveys/survey_complete.html', {'survey': survey})