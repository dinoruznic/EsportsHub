package com.esportshub.agent;

import javax.net.ssl.SSLEngine;
import javax.net.ssl.TrustManager;
import javax.net.ssl.TrustManagerFactory;
import javax.net.ssl.X509ExtendedTrustManager;
import java.net.Socket;
import java.security.GeneralSecurityException;
import java.security.KeyStore;
import java.security.cert.CertificateException;
import java.security.cert.X509Certificate;

public class LocalRiotTrustManager extends X509ExtendedTrustManager {

    static final String RIOT_HOST = "127.0.0.1";
    static final int RIOT_PORT = 2999;

    private final X509ExtendedTrustManager delegate;

    public LocalRiotTrustManager() throws GeneralSecurityException {
        TrustManagerFactory factory = TrustManagerFactory.getInstance(TrustManagerFactory.getDefaultAlgorithm());
        factory.init((KeyStore) null);
        X509ExtendedTrustManager found = null;
        for (TrustManager manager : factory.getTrustManagers()) {
            if (manager instanceof X509ExtendedTrustManager extended) {
                found = extended;
            }
        }
        if (found == null) {
            throw new GeneralSecurityException("nema zadanog X509 trust managera");
        }
        this.delegate = found;
    }

    static boolean isRiotEndpoint(String host, int port) {
        return RIOT_HOST.equals(host) && port == RIOT_PORT;
    }

    @Override
    public void checkServerTrusted(X509Certificate[] chain, String authType, SSLEngine engine) throws CertificateException {
        if (engine != null && isRiotEndpoint(engine.getPeerHost(), engine.getPeerPort())) {
            return;
        }
        delegate.checkServerTrusted(chain, authType, engine);
    }

    @Override
    public void checkServerTrusted(X509Certificate[] chain, String authType, Socket socket) throws CertificateException {
        if (socket != null && socket.getInetAddress() != null
                && isRiotEndpoint(socket.getInetAddress().getHostAddress(), socket.getPort())) {
            return;
        }
        delegate.checkServerTrusted(chain, authType, socket);
    }

    @Override
    public void checkServerTrusted(X509Certificate[] chain, String authType) throws CertificateException {
        delegate.checkServerTrusted(chain, authType);
    }

    @Override
    public void checkClientTrusted(X509Certificate[] chain, String authType, SSLEngine engine) throws CertificateException {
        delegate.checkClientTrusted(chain, authType, engine);
    }

    @Override
    public void checkClientTrusted(X509Certificate[] chain, String authType, Socket socket) throws CertificateException {
        delegate.checkClientTrusted(chain, authType, socket);
    }

    @Override
    public void checkClientTrusted(X509Certificate[] chain, String authType) throws CertificateException {
        delegate.checkClientTrusted(chain, authType);
    }

    @Override
    public X509Certificate[] getAcceptedIssuers() {
        return delegate.getAcceptedIssuers();
    }
}
