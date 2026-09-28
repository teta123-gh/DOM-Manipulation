from celery import shared_task

@shared_task
def check_deforestation_risk(plot_id):
    print(f"Checking deforestation risk for plot {plot_id}")
    return True