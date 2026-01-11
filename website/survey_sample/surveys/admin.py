from django.contrib import admin
from .models import Survey, Question, Choice, Response, Answer

class QuestionInline(admin.TabularInline):
    model = Question
    extra = 1

class ChoiceInline(admin.TabularInline):
    model = Choice
    extra = 3

@admin.register(Survey)
class SurveyAdmin(admin.ModelAdmin):
    list_display = ['title', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['title', 'description']
    inlines = [QuestionInline]

@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ['text', 'survey', 'question_type', 'order', 'is_required']
    list_filter = ['question_type', 'is_required']
    search_fields = ['text']
    inlines = [ChoiceInline]

@admin.register(Response)
class ResponseAdmin(admin.ModelAdmin):
    list_display = ['survey', 'respondent_email', 'submitted_at']
    list_filter = ['survey', 'submitted_at']
    search_fields = ['respondent_email']

@admin.register(Answer)
class AnswerAdmin(admin.ModelAdmin):
    list_display = ['response', 'question', 'get_answer']
    
    def get_answer(self, obj):
        if obj.text_answer:
            return obj.text_answer[:50]
        elif obj.choice_answer:
            return obj.choice_answer.text
        elif obj.rating_answer:
            return f"Rating: {obj.rating_answer}"
        return "No answer"
    get_answer.short_description = 'Answer'