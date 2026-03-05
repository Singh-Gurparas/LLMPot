import os
import json
import logging
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional

from app.config import settings

logger = logging.getLogger(__name__)

class LLMProvider(ABC):
    @abstractmethod
    async def classify(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """Return dict with keys: is_attack (bool), classification (str), severity (str)"""
        pass

    @abstractmethod
    async def generate_report(self, attack_data: Dict[str, Any]) -> Dict[str, Any]:
        pass

class GroqProvider(LLMProvider):
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.model = "llama-3.3-70b-versatile"
        try:
            from groq import AsyncGroq
            self.client = AsyncGroq(api_key=api_key)
        except ImportError:
            logger.error("Groq package not installed")
            self.client = None

    async def classify(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        if not self.client:
            return self._fallback_classify(request_data)
            
        prompt = f"""
        Analyze this HTTP request and determine if it's an attack.
        Return ONLY valid JSON.
        
        Request:
        Method: {request_data.get('method')}
        Path: {request_data.get('path')}
        Headers: {json.dumps(request_data.get('headers', {}))}
        Body: {request_data.get('body')}
        
        Expected JSON Schema:
        {{
            "is_attack": boolean,
            "attack_type": string (e.g., "SQL Injection", "XSS", "Directory Traversal", "Normal Traffic"),
            "severity": string ("Low", "Medium", "High", "Critical"),
            "confidence": float (0.0 to 1.0),
            "summary": string,
            "mitigation_suggestion": string
        }}
        """
        
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are an expert cybersecurity traffic analyzer. Output JSON only."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.2,
                response_format={"type": "json_object"}
            )
            data = json.loads(response.choices[0].message.content)
            # Ensure compatibility
            if "attack_type" in data:
                data["classification"] = data["attack_type"]
            return data
        except Exception as e:
            logger.error(f"Groq API error during classification: {e}")
            return self._fallback_classify(request_data)

    def _fallback_classify(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        # Simple rule-based fallback
        path = request_data.get('path', '').lower()
        if 'select' in path or 'union' in path:
            return {"is_attack": True, "attack_type": "Possible SQLi (Rule-based)", "classification": "Possible SQLi (Rule-based)", "severity": "High", "confidence": 0.5, "summary": "Detected SQL keywords in path", "mitigation_suggestion": "Input sanitization"}
        return {"is_attack": True, "attack_type": "Suspicious Activity (Rule-based)", "classification": "Suspicious Activity (Rule-based)", "severity": "Medium", "confidence": 0.3, "summary": "LLM Unavailable, rule-based detection triggered", "mitigation_suggestion": "Further investigation required"}

    async def generate_report(self, attack_data: Dict[str, Any]) -> Dict[str, Any]:
        if not self.client:
            return {}
            
        prompt = f"""
        Generate a detailed threat intelligence report for the following incident. Produce valid JSON.
        
        Data: {json.dumps(attack_data)}
        
        Expected JSON Schema:
        {{
            "attack_type": string,
            "severity": string,
            "confidence": float,
            "summary": string,
            "mitigation_suggestion": string,
            "attack_steps": list of strings,
            "executive_summary": string
        }}
        """
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a senior SOC analyst reporting on a honeypot capture. Output JSON only."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.2,
                response_format={"type": "json_object"}
            )
            return json.loads(response.choices[0].message.content)
        except Exception as e:
            logger.error(f"Groq API error during report generation: {e}")
            return {}

class LLMService:
    def __init__(self):
        self.provider = None
        if settings.LLM_PROVIDER.lower() == "groq":
            if settings.GROQ_API_KEY:
                self.provider = GroqProvider(api_key=settings.GROQ_API_KEY)
            else:
                logger.error("GROQ_API_KEY is missing. System will run with rule-based classification.")
        else:
            logger.warning(f"Unsupported LLM provider: {settings.LLM_PROVIDER}")

    async def classify_attack(self, request_data: dict) -> dict:
        if self.provider:
            return await self.provider.classify(request_data)
        
        # Rule-based fallback if no provider is configured
        path = request_data.get('path', '').lower()
        if 'wp-admin' in path or 'wp-login' in path:
            return {"is_attack": True, "classification": "WordPress Brute-force/Probe", "severity": "Medium", "confidence": 0.6, "summary": "Access attempt to sensitive WP paths", "mitigation_suggestion": "Block IP"}
        
        return {"is_attack": True, "classification": "Unclassified Probe", "severity": "Low", "confidence": 0.4, "summary": "Suspicious traffic detected without LLM analysis", "mitigation_suggestion": "Monitor IP"}

    async def generate_report(self, attack_id, event_data: dict, cls_data: dict):
        """Generates report and saves to DB asynchronously"""
        from app.database.db import AsyncSessionLocal
        from app.models.all import AttackReport
        
        if not self.provider:
            return
            
        report_json = await self.provider.generate_report({
            "event": event_data,
            "classification": cls_data
        })
        
        if report_json:
            async with AsyncSessionLocal() as db:
                report = AttackReport(
                    attack_id=attack_id,
                    report_json=report_json
                )
                db.add(report)
                try:
                    await db.commit()
                except Exception as e:
                    logger.error(f"Failed to save report: {e}")

llm_service = LLMService()
