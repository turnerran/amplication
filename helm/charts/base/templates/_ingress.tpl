{{- define "base.ingress.tpl" -}}
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: {{ .Values.name }}
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-scheme: "internet-facing"
    alb.ingress.kubernetes.io/scheme: internet-facing
spec:
  ingressClassName: nginx
  rules:
  - host: {{ .Values.ingress.hostname }}  
    http:
      paths:
      - path: {{ .Values.ingress.path }}
        pathType: Prefix
        backend:
          service:
            name: {{ .Values.name }}
            port:
              number: 80
      - path: {{ .Values.ingress.path }}
        pathType: Prefix
        backend:
          service:
            name: {{ .Values.name }}
            port:
              number: 443
  {{- if hasKey .Values.ingress "hostname_production" }}
  - host: {{ .Values.ingress.hostname_production }}  
    http:
      paths:
      - path: {{ .Values.ingress.path }}
        pathType: Prefix
        backend:
          service:
            name: {{ .Values.name }}
            port:
              number: 80
      - path: {{ .Values.ingress.path }}
        pathType: Prefix
        backend:
          service:
            name: {{ .Values.name }}
            port:
              number: 443
  {{- end }}
{{- end }}
{{- define "base.ingress" -}}
{{- include "base.util.merge" (append . "base.ingress.tpl") -}}
{{- end -}}