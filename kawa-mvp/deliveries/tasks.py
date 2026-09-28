import logging

import django_rq
import requests
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger("kawa.risk_check")


@django_rq.job("default")
def check_plot_risk(plot_id: str) -> None:
    """
    Background job: call the external deforestation risk registry for a
    plot and record the outcome. Never raises past this function — every
    attempt (success, failure, timeout) is logged to RiskCheckAttempt so a
    stuck plot is debuggable instead of silently stuck. See ADR-001.
    """
    # Local imports to avoid circular import between models and tasks.
    from .models import Plot, RiskCheckAttempt

    try:
        plot = Plot.objects.get(id=plot_id)
    except Plot.DoesNotExist:
        logger.warning("check_plot_risk: plot %s no longer exists", plot_id)
        return

    try:
        response = requests.get(
            settings.RISK_REGISTRY_URL,
            params={"lat": str(plot.latitude), "lon": str(plot.longitude)},
            timeout=settings.RISK_REGISTRY_TIMEOUT_SECONDS,  # e.g. 45
        )
        response.raise_for_status()
        payload = response.json()
        cleared = payload.get("cleared_land", False)
        result = Plot.RiskStatus.FLAGGED if cleared else Plot.RiskStatus.CLEAR

        plot.risk_status = result
        plot.risk_checked_at = timezone.now()
        plot.save(update_fields=["risk_status", "risk_checked_at"])

        RiskCheckAttempt.objects.create(
            plot=plot, succeeded=True, result=result, error_detail=""
        )
        logger.info("check_plot_risk: plot %s -> %s", plot_id, result)

    except requests.RequestException as exc:
        # Registry down/timed out. Plot stays `pending` on purpose — see
        # ADR-001: deliveries are still allowed, but the failed attempt is
        # logged so a plot stuck in `pending` is visible to Solange via
        # GET /api/v1/plots/?risk_status=pending&stale=true
        RiskCheckAttempt.objects.create(
            plot=plot, succeeded=False, result="", error_detail=str(exc)
        )
        logger.warning("check_plot_risk: plot %s failed: %s", plot_id, exc)


def enqueue_retry_for_stale_pending() -> int:
    """
    Optional operator/admin helper (not wired to a schedule in F1): re-queue
    checks for plots that have been `pending` longer than the staleness
    threshold. Left as a plain function — F1 does not require a scheduler;
    a management command or admin action can call this manually.
    """
    from datetime import timedelta

    from .models import Plot

    threshold = timezone.now() - timedelta(hours=4)
    stale = Plot.objects.filter(
        risk_status=Plot.RiskStatus.PENDING, created_at__lt=threshold
    )
    for plot in stale:
        check_plot_risk.delay(str(plot.id))
    return stale.count()
